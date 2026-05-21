package com.phishing.scanner_app.service;

import com.phishing.scanner_app.dto.CachedScanPayload;
import com.phishing.scanner_app.dto.EmailRequest;
import com.phishing.scanner_app.dto.ScanResponse;
import com.phishing.scanner_app.model.EmailScanReport;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.List;
import java.util.ArrayList;
import java.util.Locale;

import com.phishing.scanner_app.mail.MailboxService;
import com.phishing.scanner_app.dto.MailMessageResponse;
import com.phishing.scanner_app.dto.MailSummaryResponse;
import com.phishing.scanner_app.dto.MailAttachmentContent;
import com.phishing.scanner_app.dto.MailAttachmentResponse;
import com.phishing.scanner_app.dto.AttachmentScanResponse;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ScanOrchestrationService {

    private static final Logger logger = LoggerFactory.getLogger(ScanOrchestrationService.class);

    private final PhishingScannerService scannerService;
    private final FirestoreReportService firestoreReportService;
    private final FirestoreScanCacheService cacheService;
    private final FirestoreScanHistoryService historyService;
    private final ScanFingerprintService fingerprintService;
    private final ScanResponseMapper responseMapper;
    private final MailboxService mailboxService;
    private final AttachmentScannerService attachmentScannerService;
    private final boolean cacheEnabled;
    private final Duration cacheTtl;
    private final String safeBrowsingApiKey;

    public ScanOrchestrationService(
        PhishingScannerService scannerService,
        FirestoreReportService firestoreReportService,
        FirestoreScanCacheService cacheService,
        FirestoreScanHistoryService historyService,
        ScanFingerprintService fingerprintService,
        ScanResponseMapper responseMapper,
        MailboxService mailboxService,
        AttachmentScannerService attachmentScannerService,
        @Value("${scanning.cache.enabled:true}") boolean cacheEnabled,
        @Value("${scanning.cache.ttl:PT24H}") String cacheTtl,
        @Value("${GSB_API_KEY:#{null}}") String safeBrowsingApiKey
    ) {
        this.scannerService = scannerService;
        this.firestoreReportService = firestoreReportService;
        this.cacheService = cacheService;
        this.historyService = historyService;
        this.fingerprintService = fingerprintService;
        this.responseMapper = responseMapper;
        this.mailboxService = mailboxService;
        this.attachmentScannerService = attachmentScannerService;
        this.cacheEnabled = cacheEnabled;
        this.cacheTtl = Duration.parse(cacheTtl);
        this.safeBrowsingApiKey = safeBrowsingApiKey;
    }

    public ScanResponse scanEmail(String userId, EmailRequest request, boolean forceRefresh) {
        Instant now = Instant.now();
        String canonicalPayload = fingerprintService.canonicalPayload(request);
        String cacheKey = fingerprintService.cacheKeyFromCanonicalPayload(canonicalPayload);
        String sourceType = request.hasBodyContent() ? "full_email" : "link_only";

        if (cacheEnabled && !forceRefresh) {
            Optional<FirestoreScanCacheService.ScanCacheEntry> cachedEntry = cacheService.get(cacheKey);
            if (cachedEntry.isPresent()) {
                FirestoreScanCacheService.ScanCacheEntry entry = cachedEntry.get();
                CachedScanPayload payload = withRequestMetadata(entry.payload(), request);
                cacheService.recordCacheHit(cacheKey);
                String historyId = historyService.saveHistory(
                    userId,
                    payload.reportId(),
                    cacheKey,
                    "cache_hit",
                    payload,
                    now
                );
                return payload.toScanResponse(true, entry.expiresAt(), historyId);
            }
        }

        List<AttachmentScanResponse> attachmentResults = new ArrayList<>();
        
        if (request.getQuery() != null && !request.getQuery().isBlank()) {
            try {
                List<MailSummaryResponse> summaries = mailboxService.listMessages(userId, request.getProvider(), 1, request.getQuery());
                if (!summaries.isEmpty()) {
                    request.setMessageId(summaries.get(0).id());
                }
            } catch (Exception e) {
                logger.warn("Failed to search messages using query: " + request.getQuery(), e);
            }
        }

        if (request.getMessageId() != null && !request.getMessageId().isBlank()) {
            try {
                MailMessageResponse mailMsg;
                if (shouldResolveMessageIdFirst(request)) {
                    String resolvedMessageId = resolveMailboxMessageId(userId, request);
                    if (resolvedMessageId != null && !resolvedMessageId.isBlank()) {
                        logger.info("Pre-resolved mailbox messageId from {} to {}", request.getMessageId(), resolvedMessageId);
                        request.setMessageId(resolvedMessageId);
                    }
                }
                try {
                    mailMsg = mailboxService.getMessage(userId, request.getProvider(), request.getMessageId());
                } catch (Exception primaryLookupFailure) {
                    String resolvedMessageId = resolveMailboxMessageId(userId, request);
                    if (resolvedMessageId == null) {
                        throw primaryLookupFailure;
                    }
                    logger.info("Resolved mailbox messageId from {} to {}", request.getMessageId(), resolvedMessageId);
                    request.setMessageId(resolvedMessageId);
                    mailMsg = mailboxService.getMessage(userId, request.getProvider(), resolvedMessageId);
                }
                if (!request.hasBodyContent()) {
                    request.setSubject(mailMsg.subject());
                    request.setFrom(mailMsg.from());
                    request.setBodyHtml(mailMsg.bodyHtml());
                    request.setBodyText(mailMsg.bodyText());
                }
                
                if (mailMsg.attachments() != null) {
                    for (MailAttachmentResponse att : mailMsg.attachments()) {
                        MailAttachmentContent content = mailboxService.getAttachment(userId, request.getProvider(), request.getMessageId(), att.id(), att.filename(), att.mimeType());
                        AttachmentScanResponse attRes = attachmentScannerService.scanAttachment(content.content(), content.filename(), content.mimeType());
                        attachmentResults.add(attRes);
                    }
                }
            } catch (Exception e) {
                logger.warn("Failed to fetch email/attachments using MailboxService for messageId: " + request.getMessageId(), e);
            }
        }

        EmailScanReport freshReport = scannerService.scanEmail(request, safeBrowsingApiKey, attachmentResults);
        String reportId = firestoreReportService.savePhishingReport(request, freshReport);
        CachedScanPayload payload = responseMapper.toCachedPayload(
            freshReport,
            reportId,
            now.toString(),
            extractionSource(request),
            normalizeProvider(request.getProvider()),
            blankToNull(request.getMessageId())
        );

        String cacheExpiresAt = null;
        if (cacheEnabled) {
            cacheExpiresAt = now.plus(cacheTtl).toString();
            cacheService.save(
                cacheKey,
                canonicalPayload,
                fingerprintService.cacheVersion(),
                sourceType,
                payload,
                reportId,
                cacheExpiresAt
            );
        }

        String historyId = historyService.saveHistory(userId, reportId, cacheKey, "fresh_scan", payload, now);
        return payload.toScanResponse(false, cacheExpiresAt, historyId);
    }

    private String resolveMailboxMessageId(String userId, EmailRequest request) {
        try {
            List<MailSummaryResponse> summaries = mailboxService.listMessages(
                userId,
                request.getProvider(),
                10,
                buildResolutionQuery(request)
            );

            if (summaries.isEmpty()) {
                return null;
            }

            String requestedId = normalize(request.getMessageId());
            String requestedFrom = normalize(request.getFrom());
            String requestedSubject = normalize(request.getSubject());

            for (MailSummaryResponse summary : summaries) {
                if (requestedId.equals(normalize(summary.id())) || requestedId.equals(normalize(summary.threadId()))) {
                    return summary.id();
                }
            }

            for (MailSummaryResponse summary : summaries) {
                boolean subjectMatches = !requestedSubject.isBlank() && requestedSubject.equals(normalize(summary.subject()));
                boolean fromMatches = !requestedFrom.isBlank() && requestedFrom.equals(normalize(summary.from()));
                if (subjectMatches || fromMatches) {
                    return summary.id();
                }
            }

            return summaries.get(0).id();
        } catch (Exception resolutionError) {
            logger.warn("Failed to resolve mailbox messageId for provider={} originalMessageId={}",
                request.getProvider(), request.getMessageId(), resolutionError);
            return null;
        }
    }

    private String buildResolutionQuery(EmailRequest request) {
        if (request.getQuery() != null && !request.getQuery().isBlank()) {
            return request.getQuery();
        }

        String subject = request.getSubject() == null ? "" : request.getSubject().trim();
        String from = request.getFrom() == null ? "" : request.getFrom().trim();

        if (!subject.isBlank() && !from.isBlank()) {
            return "from:(" + from + ") subject:(" + subject + ")";
        }
        if (!from.isBlank()) {
            return "from:(" + from + ")";
        }
        if (!subject.isBlank()) {
            return "subject:(" + subject + ")";
        }
        return "";
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeProvider(String provider) {
        String normalized = normalize(provider);
        if (normalized.isBlank()) {
            return null;
        }
        return "gmail".equals(normalized) ? "google" : normalized;
    }

    private String extractionSource(EmailRequest request) {
        String explicitSource = normalizeExtractionSource(request.getExtractionSource());
        if (explicitSource != null) {
            return explicitSource;
        }
        return hasMailboxIdentifier(request) ? "provider-api" : "dom";
    }

    private boolean hasMailboxIdentifier(EmailRequest request) {
        return !normalize(request.getMessageId()).isBlank() || !normalize(request.getQuery()).isBlank();
    }

    private String blankToNull(String value) {
        String normalized = value == null ? "" : value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeExtractionSource(String value) {
        String normalized = normalize(value);
        if ("provider-api".equals(normalized) || "dom".equals(normalized)) {
            return normalized;
        }
        return null;
    }

    private CachedScanPayload withRequestMetadata(CachedScanPayload payload, EmailRequest request) {
        String extractionSource = payload.extractionSource() == null || payload.extractionSource().isBlank()
            ? extractionSource(request)
            : payload.extractionSource();
        String provider = payload.provider() == null || payload.provider().isBlank()
            ? normalizeProvider(request.getProvider())
            : payload.provider();
        String messageId = payload.messageId() == null || payload.messageId().isBlank()
            ? blankToNull(request.getMessageId())
            : payload.messageId();

        return new CachedScanPayload(
            payload.subject(),
            payload.sender(),
            payload.urlCount(),
            payload.sections(),
            payload.headerInspectionResult(),
            payload.overallRiskScore(),
            payload.reportId(),
            payload.aiAnalysis(),
            payload.scannedAt(),
            extractionSource,
            provider,
            messageId,
            payload.attachments()
        );
    }

    private boolean shouldResolveMessageIdFirst(EmailRequest request) {
        String provider = normalize(request.getProvider());
        String messageId = request.getMessageId() == null ? "" : request.getMessageId().trim();
        String query = request.getQuery() == null ? "" : request.getQuery().trim();

        if (!query.isBlank()) {
            return true;
        }

        // Gmail UI/thread tokens (for example FMfc...) are not Gmail API message IDs.
        if ("google".equals(provider)) {
            return messageId.startsWith("FMfc");
        }

        return false;
    }
}
