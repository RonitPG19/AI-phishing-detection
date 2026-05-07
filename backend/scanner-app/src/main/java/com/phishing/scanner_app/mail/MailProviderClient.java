package com.phishing.scanner_app.mail;

import com.phishing.scanner_app.dto.MailAttachmentContent;
import com.phishing.scanner_app.dto.MailMessageResponse;
import com.phishing.scanner_app.dto.MailSummaryResponse;

import java.util.List;

interface MailProviderClient {

    String provider();

    List<MailSummaryResponse> listMessages(String userId, int limit, String query);

    MailMessageResponse getMessage(String userId, String messageId);

    MailAttachmentContent getAttachment(String userId, String messageId, String attachmentId);
}
