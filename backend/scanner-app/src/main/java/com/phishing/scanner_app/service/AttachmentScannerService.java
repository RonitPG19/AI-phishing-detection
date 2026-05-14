package com.phishing.scanner_app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.phishing.scanner_app.dto.AttachmentScanResponse;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class AttachmentScannerService {

    private static final Logger logger = LoggerFactory.getLogger(AttachmentScannerService.class);

    private final String pythonPath;
    private final String scriptPath;
    private final int timeoutSeconds;
    private final int maxFileSizeMb;
    private final String groqApiKey;
    private final ObjectMapper objectMapper;
    private final Tika tika;

    public AttachmentScannerService(
            @Value("${attachment.scanner.python-path:python}") String pythonPath,
            @Value("${attachment.scanner.script-path:../attachments/ai_agent.py}") String scriptPath,
            @Value("${attachment.scanner.timeout-seconds:60}") int timeoutSeconds,
            @Value("${attachment.scanner.max-file-size-mb:10}") int maxFileSizeMb,
            @Value("${groq.api.key:}") String groqApiKey,
            ObjectMapper objectMapper) {
        this.pythonPath = pythonPath;
        this.scriptPath = scriptPath;
        this.timeoutSeconds = timeoutSeconds;
        this.maxFileSizeMb = maxFileSizeMb;
        this.groqApiKey = groqApiKey;
        this.objectMapper = objectMapper;
        this.tika = new Tika();
    }

    public AttachmentScanResponse scanAttachment(byte[] content, String filename, String declaredMimeType) {
        // 1. File size check
        long maxBytes = maxFileSizeMb * 1024L * 1024L;
        if (content.length > maxBytes) {
            return new AttachmentScanResponse(
                filename, declaredMimeType, null, "Benign",
                "File size (" + (content.length / 1024 / 1024) + "MB) exceeds limit of " + maxFileSizeMb + "MB. Skipping scan.",
                "Skipped due to size", new ArrayList<>()
            );
        }

        // 2. MIME type spoofing check
        String detectedMimeType = tika.detect(content, filename);
        if (isMimeTypeSpoofing(declaredMimeType, detectedMimeType)) {
            return new AttachmentScanResponse(
                filename, declaredMimeType, detectedMimeType, "Malicious",
                "The attachment claims to be " + declaredMimeType + " but is actually " + detectedMimeType + ". This is a common phishing technique.",
                "MIME Spoofing Detected", new ArrayList<>()
            );
        }

        // 3. Python AI Scan
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("attachment_scan_" + UUID.randomUUID().toString());
            Path filePath = tempDir.resolve(filename);
            Files.write(filePath, content);

            ProcessBuilder pb = new ProcessBuilder(pythonPath, scriptPath, tempDir.toString());
            if (groqApiKey != null && !groqApiKey.isBlank()) {
                pb.environment().put("GROQ_API_KEY", groqApiKey);
            }
            pb.redirectErrorStream(true); // Combine stderr and stdout

            logger.info("Running Python attachment scanner for {}", filename);
            Process process = pb.start();
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                logger.warn("Python scanner timed out after {} seconds for {}", timeoutSeconds, filename);
                return new AttachmentScanResponse(
                    filename, declaredMimeType, detectedMimeType, "Unknown",
                    "Scan timed out", "Timeout", new ArrayList<>()
                );
            }

            Path reportPath = tempDir.resolve("final_phishing_report.json");
            if (Files.exists(reportPath)) {
                JsonNode rootNode = objectMapper.readTree(reportPath.toFile());
                String verdict = rootNode.path("Verdict").asText("Unknown");
                String predictedBehavior = rootNode.path("Predicted Behavior").asText("");
                String technicalReason = rootNode.path("Technical Reason").asText("");
                
                List<String> extractedUrls = new ArrayList<>();
                JsonNode urlsNode = rootNode.path("URL Extraction");
                if (urlsNode.isArray()) {
                    for (JsonNode urlNode : urlsNode) {
                        extractedUrls.add(urlNode.asText());
                    }
                }
                
                return new AttachmentScanResponse(
                    filename, declaredMimeType, detectedMimeType, verdict,
                    predictedBehavior, technicalReason, extractedUrls
                );
            } else {
                logger.warn("No final_phishing_report.json generated for {}", filename);
                return new AttachmentScanResponse(
                    filename, declaredMimeType, detectedMimeType, "Unknown",
                    "Failed to generate report", "Missing JSON output", new ArrayList<>()
                );
            }

        } catch (Exception e) {
            logger.error("Error scanning attachment {}", filename, e);
            return new AttachmentScanResponse(
                filename, declaredMimeType, detectedMimeType, "Error",
                "Internal error during scanning: " + e.getMessage(), "Exception", new ArrayList<>()
            );
        } finally {
            if (tempDir != null) {
                try {
                    Files.walk(tempDir)
                        .map(Path::toFile)
                        .forEach(File::delete);
                } catch (IOException e) {
                    logger.warn("Failed to clean up temp directory {}", tempDir, e);
                }
            }
        }
    }

    private boolean isMimeTypeSpoofing(String declared, String detected) {
        if (declared == null || detected == null) return false;
        
        // A common attack is sending an executable (.exe, .msi, etc) but declaring it as a harmless document (PDF, TXT, JPG).
        String declaredLower = declared.toLowerCase();
        String detectedLower = detected.toLowerCase();

        // If it's detected as an executable or script but claimed to be a document
        boolean isDetectedDangerous = detectedLower.contains("executable") || 
                                      detectedLower.contains("x-msdownload") ||
                                      detectedLower.contains("javascript") ||
                                      detectedLower.contains("vbscript");
                                      
        boolean isDeclaredSafe = declaredLower.contains("pdf") || 
                                 declaredLower.contains("image") || 
                                 declaredLower.contains("text/plain");

        return isDetectedDangerous && isDeclaredSafe;
    }
}
