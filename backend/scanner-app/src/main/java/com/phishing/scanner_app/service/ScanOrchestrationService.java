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
                cacheService.recordCacheHit(cacheKey);
                String historyId = historyService.saveHistory(
                    userId,
                    entry.payload().reportId(),
                    cacheKey,
                    "cache_hit",
                    entry.payload(),
                    now
                );
                return entry.payload().toScanResponse(true, entry.expiresAt(), historyId);
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
                MailMessageResponse mailMsg = mailboxService.getMessage(userId, request.getProvider(), request.getMessageId());
                if (!request.hasBodyContent()) {
                    request.setSubject(mailMsg.subject());
                    request.setFrom(mailMsg.from());
                    request.setBodyHtml(mailMsg.bodyHtml());
                    request.setBodyText(mailMsg.bodyText());
                }
                
                if (mailMsg.attachments() != null) {
                    for (MailAttachmentResponse att : mailMsg.attachments()) {
                        MailAttachmentContent content = mailboxService.getAttachment(userId, request.getProvider(), request.getMessageId(), att.id());
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
        CachedScanPayload payload = responseMapper.toCachedPayload(freshReport, reportId, now.toString());

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
}
