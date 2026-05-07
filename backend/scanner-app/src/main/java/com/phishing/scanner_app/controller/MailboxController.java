package com.phishing.scanner_app.controller;

import com.phishing.scanner_app.dto.MailAttachmentContent;
import com.phishing.scanner_app.dto.MailConnectionResponse;
import com.phishing.scanner_app.dto.MailMessageResponse;
import com.phishing.scanner_app.dto.MailSummaryResponse;
import com.phishing.scanner_app.mail.MailboxService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/mail")
public class MailboxController {

    private final MailboxService mailboxService;

    public MailboxController(MailboxService mailboxService) {
        this.mailboxService = mailboxService;
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/connections")
    public ResponseEntity<List<MailConnectionResponse>> connections(Authentication authentication) {
        return ResponseEntity.ok(mailboxService.connections(authentication.getName()));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/messages")
    public ResponseEntity<List<MailSummaryResponse>> listMessages(
        Authentication authentication,
        @RequestParam(defaultValue = "google") String provider,
        @RequestParam(defaultValue = "10") int limit,
        @RequestParam(required = false) String query
    ) {
        return ResponseEntity.ok(mailboxService.listMessages(authentication.getName(), provider, limit, query));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/messages/{messageId}")
    public ResponseEntity<MailMessageResponse> getMessage(
        Authentication authentication,
        @RequestParam(defaultValue = "google") String provider,
        @PathVariable String messageId
    ) {
        return ResponseEntity.ok(mailboxService.getMessage(authentication.getName(), provider, messageId));
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @GetMapping("/messages/{messageId}/attachments/{attachmentId}")
    public ResponseEntity<byte[]> getAttachment(
        Authentication authentication,
        @RequestParam(defaultValue = "google") String provider,
        @PathVariable String messageId,
        @PathVariable String attachmentId
    ) {
        MailAttachmentContent attachment = mailboxService.getAttachment(
            authentication.getName(),
            provider,
            messageId,
            attachmentId
        );

        return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(attachment.mimeType()))
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                .filename(attachment.filename())
                .build()
                .toString())
            .body(attachment.content());
    }

    @PreAuthorize("hasAnyRole('USER','ADMIN')")
    @DeleteMapping("/connections/{provider}")
    public ResponseEntity<Void> disconnect(Authentication authentication, @PathVariable String provider) {
        mailboxService.disconnect(authentication.getName(), provider);
        return ResponseEntity.noContent().build();
    }
}
