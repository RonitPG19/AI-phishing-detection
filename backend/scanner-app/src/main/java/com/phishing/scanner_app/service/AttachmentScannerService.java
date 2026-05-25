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
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

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
    private static final Map<String, Set<String>> EXTENSION_MIME_ALLOWLIST = buildExtensionMimeAllowlist();

    public AttachmentScannerService(
            @Value("${attachment.scanner.python-path:python}") String pythonPath,
            @Value("${attachment.scanner.script-path:../../attachments/ai_agent.py}") String scriptPath,
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

        // 2b. Extension vs MIME mismatch check
        if (isExtensionMimeMismatch(filename, detectedMimeType)) {
            return new AttachmentScanResponse(
                filename, declaredMimeType, detectedMimeType, "Malicious",
                "The file extension does not match the detected MIME type. The file may be disguised to bypass filters.",
                "Extension/MIME Mismatch Detected", new ArrayList<>()
            );
        }

        ArchiveInspectionResult archiveInspectionResult = inspectArchiveForNestedArchives(content, filename, detectedMimeType);
        if (archiveInspectionResult.blocked()) {
            return new AttachmentScanResponse(
                filename, declaredMimeType, detectedMimeType, "Malicious",
                archiveInspectionResult.message(),
                archiveInspectionResult.reason(),
                new ArrayList<>()
            );
        }

        // 3. Python AI Scan
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("attachment_scan_" + UUID.randomUUID());
            // Resolve target path under tempDir. The incoming filename may include
            // directory separators (e.g. "taco/..") which don't yet exist. Also
            // guard against path traversal attempts that escape the tempDir.
            Path filePath = tempDir.resolve(filename).normalize();

            // If normalization escapes the temp directory, fall back to using only
            // the filename component to avoid writing outside of the sandbox.
            if (!filePath.startsWith(tempDir)) {
                filePath = tempDir.resolve(Path.of(filename).getFileName().toString()).normalize();
            }

            // Ensure parent directories exist (Files.write does not create them).
            Path parent = filePath.getParent();
            if (parent != null && !Files.exists(parent)) {
                Files.createDirectories(parent);
            }

            Files.write(filePath, content);

            Path resolvedScriptPath = resolveScriptPath();
            if (resolvedScriptPath == null) {
                logger.warn("Attachment scanner script was not found. Configured path: {}", scriptPath);
                return new AttachmentScanResponse(
                    filename, declaredMimeType, detectedMimeType, "Unknown",
                    "Attachment scanner script was not found",
                    "Configured script path does not exist: " + scriptPath,
                    new ArrayList<>()
                );
            }

            ProcessBuilder pb = new ProcessBuilder(pythonPath, resolvedScriptPath.toString(), tempDir.toString());
            logger.info("Python path: {}", pythonPath);
            logger.info("Script path: {}", resolvedScriptPath);
            logger.info("Script exists: {}", Files.exists(resolvedScriptPath));
            if (groqApiKey != null && !groqApiKey.isBlank()) {
                pb.environment().put("GROQ_API_KEY", groqApiKey);
            }
            Path logPath = tempDir.resolve("process.log");
            pb.redirectOutput(logPath.toFile());
            pb.redirectErrorStream(true); // Combine stderr and stdout

            logger.info("Running Python attachment scanner for {}", filename);
            Process process = pb.start();
            
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);

            String processOutput = "";
            if (Files.exists(logPath)) {
                processOutput = Files.readString(logPath);
            }

            if (!finished) {
                process.destroyForcibly();
                logger.warn("Python scanner timed out after {} seconds for {}. Output: {}", timeoutSeconds, filename, processOutput);
                return new AttachmentScanResponse(
                    filename, declaredMimeType, detectedMimeType, "Unknown",
                    "Scan timed out", "Timeout", new ArrayList<>()
                );
            }
//            logger.info("Process output:\n{}", processOutput);
//            logger.info("Exit code: {}", process.exitValue());
            // Add this check!
            int exitValue = process.exitValue();
            if (exitValue != 0) {
                logger.error("Python script crashed with exit code {}. Log output: {}", exitValue, processOutput);
            }

            Path reportPath = tempDir.resolve("final_phishing_report.json");
            if (Files.exists(reportPath)) {
                JsonNode rootNode = objectMapper.readTree(reportPath.toFile());

                // Get the first result from the "analysis_results" array
                JsonNode resultsArray = rootNode.path("analysis_results");
                if (resultsArray.isArray() && !resultsArray.isEmpty()) {
                    JsonNode firstResult = resultsArray.get(0);

                    // Map to Python's output keys
                    String verdict = firstResult.path("status").asText("Unknown");
                    String predictedBehavior = firstResult.path("predicted_behavior").asText("");
                    String technicalReason = firstResult.path("technical_reason").asText("");

                    List<String> extractedUrls = new ArrayList<>();

                    return new AttachmentScanResponse(
                            filename, declaredMimeType, detectedMimeType, verdict,
                            predictedBehavior, technicalReason, extractedUrls
                    );
                } else {
                    // ADDED: Fallback return if the JSON exists but the array is empty/missing
                    logger.warn("JSON report generated but 'analysis_results' is empty for {}. Process output: {}", filename, processOutput);
                    return new AttachmentScanResponse(
                            filename, declaredMimeType, detectedMimeType, "Unknown",
                            "No analysis results found in report", "Empty JSON array", new ArrayList<>()
                    );
                }
            } else {
                logger.warn("No final_phishing_report.json generated for {}. Process output: {}", filename, processOutput);
                return new AttachmentScanResponse(
                        filename, declaredMimeType, detectedMimeType, "Unknown",
                        "Failed to generate report",
                        "Missing JSON output" + summarizeProcessOutput(processOutput),
                        new ArrayList<>()
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
                        // Delete children before parents to ensure directories are removed.
                        Files.walk(tempDir)
                            .sorted(Comparator.reverseOrder())
                            .map(Path::toFile)
                            .forEach(File::delete);
                } catch (IOException e) {
                    logger.warn("Failed to clean up temp directory {}", tempDir, e);
                }
            }
        }
    }

    private Path resolveScriptPath() {
        List<Path> candidates = List.of(
            Path.of(scriptPath),
            Path.of("../../attachments/ai_agent.py"),
            Path.of("attachments/ai_agent.py"),
            Path.of("../attachments/ai_agent.py")
        );

        for (Path candidate : candidates) {
            Path normalized = candidate.toAbsolutePath().normalize();
            if (Files.exists(normalized)) {
                return normalized;
            }
        }

        return null;
    }

    private String summarizeProcessOutput(String processOutput) {
        if (processOutput == null || processOutput.isBlank()) {
            return "";
        }

        String compact = processOutput.replaceAll("\\s+", " ").trim();
        int maxLength = 300;
        if (compact.length() > maxLength) {
            compact = compact.substring(0, maxLength) + "...";
        }
        return ": " + compact;
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

    private boolean isExtensionMimeMismatch(String filename, String detectedMimeType) {
        if (filename == null || detectedMimeType == null) {
            return false;
        }

        String extension = getFileExtension(filename);
        if (extension.isBlank()) {
            return false;
        }

        Set<String> allowedMimeTypes = EXTENSION_MIME_ALLOWLIST.get(extension);
        if (allowedMimeTypes == null || allowedMimeTypes.isEmpty()) {
            return false;
        }

        String detectedLower = detectedMimeType.toLowerCase(Locale.ROOT);
        for (String allowed : allowedMimeTypes) {
            if (detectedLower.equals(allowed) || detectedLower.startsWith(allowed + ";")) {
                return false;
            }
        }

        // Avoid false positives when detector returns an unknown generic type.
        if ("application/octet-stream".equals(detectedLower)) {
            return false;
        }

        return true;
    }

    private String getFileExtension(String filename) {
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private static Map<String, Set<String>> buildExtensionMimeAllowlist() {
        Map<String, Set<String>> mapping = new HashMap<>();

        mapping.put("pdf", Set.of("application/pdf"));
        mapping.put("txt", Set.of("text/plain"));
        mapping.put("csv", Set.of("text/csv", "text/plain"));
        mapping.put("json", Set.of("application/json", "text/plain"));
        mapping.put("xml", Set.of("application/xml", "text/xml", "application/xhtml+xml"));

        mapping.put("jpg", Set.of("image/jpeg"));
        mapping.put("jpeg", Set.of("image/jpeg"));
        mapping.put("png", Set.of("image/png"));
        mapping.put("gif", Set.of("image/gif"));
        mapping.put("webp", Set.of("image/webp"));

        mapping.put("doc", Set.of("application/msword"));
        mapping.put("docx", Set.of("application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
        mapping.put("xls", Set.of("application/vnd.ms-excel"));
        mapping.put("xlsx", Set.of("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        mapping.put("ppt", Set.of("application/vnd.ms-powerpoint"));
        mapping.put("pptx", Set.of("application/vnd.openxmlformats-officedocument.presentationml.presentation"));

        mapping.put("zip", Set.of("application/zip"));
        mapping.put("rar", Set.of("application/vnd.rar", "application/x-rar-compressed"));
        mapping.put("7z", Set.of("application/x-7z-compressed"));
        mapping.put("gz", Set.of("application/gzip", "application/x-gzip"));

        mapping.put("exe", Set.of("application/x-dosexec", "application/x-msdownload"));
        mapping.put("msi", Set.of("application/x-msi"));
        mapping.put("js", Set.of("application/javascript", "text/javascript"));
        mapping.put("vbs", Set.of("text/vbscript", "application/x-vbs"));

        return Collections.unmodifiableMap(mapping);
    }

    private ArchiveInspectionResult inspectArchiveForNestedArchives(byte[] content, String filename, String detectedMimeType) {
        String extension = getFileExtension(filename);
        boolean isZip = "zip".equals(extension) || "application/zip".equalsIgnoreCase(detectedMimeType);
        boolean is7z = "7z".equals(extension) || "application/x-7z-compressed".equalsIgnoreCase(detectedMimeType);

        if (isZip) {
            try (ZipInputStream zis = new ZipInputStream(new ByteArrayInputStream(content))) {
                ZipEntry entry;
                while ((entry = zis.getNextEntry()) != null) {
                    if (entry.isDirectory()) {
                        continue;
                    }

                    String entryName = entry.getName() == null ? "" : entry.getName().toLowerCase(Locale.ROOT);
                    if (isArchiveFileName(entryName)) {
                        return ArchiveInspectionResult.block(
                            "Nested archive detected inside ZIP (" + entry.getName() + "). Nested archives are commonly used to hide phishing payloads.",
                            "Nested Archive Detected"
                        );
                    }

                    byte[] header = readEntryHeader(zis, 8);
                    if (looksLikeZip(header) || looksLike7z(header)) {
                        return ArchiveInspectionResult.block(
                            "Embedded archive content detected inside ZIP entry (" + entry.getName() + ").",
                            "Nested Archive Signature Detected"
                        );
                    }
                }
            } catch (IOException e) {
                logger.warn("Failed to inspect ZIP archive for nested archives: {}", filename, e);
            }
        }

        if (is7z) {
            logger.info("7z attachment detected ({}). Nested archive inspection is limited without a 7z parser dependency.", filename);
        }

        return ArchiveInspectionResult.allow();
    }

    private boolean isArchiveFileName(String name) {
        return name.endsWith(".zip")
            || name.endsWith(".7z")
            || name.endsWith(".rar")
            || name.endsWith(".tar")
            || name.endsWith(".gz")
            || name.endsWith(".bz2")
            || name.endsWith(".xz");
    }

    private byte[] readEntryHeader(InputStream in, int maxBytes) throws IOException {
        byte[] buffer = new byte[maxBytes];
        int offset = 0;
        while (offset < maxBytes) {
            int read = in.read(buffer, offset, maxBytes - offset);
            if (read < 0) {
                break;
            }
            offset += read;
        }
        if (offset == maxBytes) {
            return buffer;
        }
        byte[] truncated = new byte[offset];
        System.arraycopy(buffer, 0, truncated, 0, offset);
        return truncated;
    }

    private boolean looksLikeZip(byte[] header) {
        return header.length >= 4
            && header[0] == 0x50
            && header[1] == 0x4B
            && (header[2] == 0x03 || header[2] == 0x05 || header[2] == 0x07)
            && (header[3] == 0x04 || header[3] == 0x06 || header[3] == 0x08);
    }

    private boolean looksLike7z(byte[] header) {
        return header.length >= 6
            && header[0] == 0x37
            && header[1] == 0x7A
            && (header[2] & 0xFF) == 0xBC
            && (header[3] & 0xFF) == 0xAF
            && header[4] == 0x27
            && header[5] == 0x1C;
    }

    private record ArchiveInspectionResult(boolean blocked, String message, String reason) {
        private static ArchiveInspectionResult allow() {
            return new ArchiveInspectionResult(false, "", "");
        }

        private static ArchiveInspectionResult block(String message, String reason) {
            return new ArchiveInspectionResult(true, message, reason);
        }
    }
}
