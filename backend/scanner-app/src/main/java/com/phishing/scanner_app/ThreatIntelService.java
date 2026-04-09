package com.phishing.scanner_app;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Duration;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Properties;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ThreatIntelService {

    private static final Logger logger = LoggerFactory.getLogger(ThreatIntelService.class);
    private static final int NETWORK_TIMEOUT_MS = 7000;

    private final AtomicReference<Set<String>> blacklistedUrls = new AtomicReference<>(Set.of());
    private final Object refreshLock = new Object();

    @Value("${threat-intel.data-directory:data/threat-intel}")
    private String dataDirectory;

    @Value("${threat-intel.openphish-url:https://openphish.com/feed.txt}")
    private String openPhishUrl;

    @Value("${threat-intel.phishtank-url:}")
    private String phishTankUrl;

    @Value("${threat-intel.urlhaus-url:}")
    private String urlhausUrl;

    @Value("${threat-intel.max-age-hours:24}")
    private long maxAgeHours;

    private Path blacklistCsvPath;
    private Path metadataPath;

    @PostConstruct
    public void initialize() {
        try {
            Path dir = Path.of(dataDirectory);
            Files.createDirectories(dir);
            blacklistCsvPath = dir.resolve("blacklist.csv");
            metadataPath = dir.resolve("blacklist-metadata.properties");
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to initialize threat intel storage", exception);
        }

        loadFromDisk();
        refreshIfDue();
    }

    @Scheduled(fixedRateString = "${threat-intel.refresh-check-ms:3600000}")
    public void scheduledRefresh() {
        refreshIfDue();
    }

    public Set<String> getBlacklistedUrls() {
        return blacklistedUrls.get();
    }

    public boolean isBlacklisted(String url) {
        return blacklistedUrls.get().contains(normalizeUrl(url));
    }

    public void refreshIfDue() {
        synchronized (refreshLock) {
            Instant lastUpdated = readLastUpdatedTimestamp();
            if (lastUpdated != null) {
                Duration age = Duration.between(lastUpdated, Instant.now());
                if (age.compareTo(Duration.ofHours(maxAgeHours)) < 0) {
                    return;
                }
            }

            Set<String> merged = new LinkedHashSet<>();
            merged.addAll(fetchOpenPhish());
            merged.addAll(fetchPhishTankCsv());
            merged.addAll(fetchUrlhaus());

            if (merged.isEmpty()) {
                logger.warn("Threat intel refresh returned no records; keeping previous blacklist");
                return;
            }

            Set<String> immutable = Collections.unmodifiableSet(merged);
            blacklistedUrls.set(immutable);
            persistBlacklistCsv(immutable);
            writeLastUpdatedTimestamp(Instant.now());
            logger.info("Threat intel updated with {} URLs", immutable.size());
        }
    }

    private void loadFromDisk() {
        if (blacklistCsvPath == null || !Files.exists(blacklistCsvPath)) {
            return;
        }

        Set<String> loaded = new LinkedHashSet<>();
        try (BufferedReader reader = Files.newBufferedReader(blacklistCsvPath, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                String normalized = normalizeUrl(line.trim());
                if (!normalized.isEmpty()) {
                    loaded.add(normalized);
                }
            }
            blacklistedUrls.set(Collections.unmodifiableSet(loaded));
            logger.info("Loaded {} blacklist URLs from disk", loaded.size());
        } catch (IOException exception) {
            logger.warn("Failed to load blacklist cache: {}", exception.getMessage());
        }
    }

    private Set<String> fetchUrlhaus() {
        if (urlhausUrl == null || urlhausUrl.isBlank()) {
            return Set.of();
        }
        return fetchTextFeed(urlhausUrl);
    }

    private Set<String> fetchOpenPhish() {
        return fetchTextFeed(openPhishUrl);
    }

    private Set<String> fetchPhishTankCsv() {
        if (phishTankUrl == null || phishTankUrl.isBlank()) {
            return Set.of();
        }

        Set<String> feed = new LinkedHashSet<>();
        HttpURLConnection connection = null;
        try {
            URI uri = URI.create(phishTankUrl.trim());
            URL url = uri.toURL();
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(NETWORK_TIMEOUT_MS);
            connection.setReadTimeout(NETWORK_TIMEOUT_MS);

            if (connection.getResponseCode() != 200) {
                logger.warn("PhishTank feed returned HTTP {}", connection.getResponseCode());
                return Set.of();
            }


            try (BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String extracted = extractPhishTankUrl(line);
                    if (extracted == null || extracted.isBlank()) {
                        continue;
                    }
                    String normalized = normalizeUrl(extracted);
                    if (!normalized.isEmpty()) {
                        feed.add(normalized);
                    }
                }
            }
        } catch (Exception exception) {
            logger.warn("Failed to fetch PhishTank feed: {}", exception.getMessage());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
        return feed;
    }

    private Set<String> fetchTextFeed(String endpoint) {
        Set<String> feed = new LinkedHashSet<>();
        HttpURLConnection connection = null;
        try {
            URI uri = URI.create(endpoint);
            URL url = uri.toURL();
            connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(NETWORK_TIMEOUT_MS);
            connection.setReadTimeout(NETWORK_TIMEOUT_MS);

            if (connection.getResponseCode() != 200) {
                logger.warn("Threat feed {} returned HTTP {}", endpoint, connection.getResponseCode());
                return Set.of();
            }

            try (BufferedReader reader = new BufferedReader(new java.io.InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.isEmpty() || trimmed.startsWith("#")) {
                        continue;
                    }
                    String normalized = normalizeUrl(trimmed);
                    if (!normalized.isEmpty()) {
                        feed.add(normalized);
                    }
                }
            }
        } catch (Exception exception) {
            logger.warn("Failed to fetch threat feed {}: {}", endpoint, exception.getMessage());
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
        return feed;
    }

    private void persistBlacklistCsv(Set<String> urls) {
        Path tempPath = blacklistCsvPath.resolveSibling("blacklist.csv.tmp");
        try (BufferedWriter writer = Files.newBufferedWriter(tempPath, StandardCharsets.UTF_8)) {
            for (String url : urls) {
                writer.write(url);
                writer.newLine();
            }
        } catch (IOException exception) {
            logger.warn("Failed to write temporary blacklist CSV: {}", exception.getMessage());
            return;
        }

        try {
            Files.move(tempPath, blacklistCsvPath, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (IOException exception) {
            logger.warn("Atomic move failed for blacklist CSV; retrying without ATOMIC_MOVE: {}", exception.getMessage());
            try {
                Files.move(tempPath, blacklistCsvPath, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException moveException) {
                logger.warn("Failed to persist blacklist CSV: {}", moveException.getMessage());
            }
        }
    }

    private Instant readLastUpdatedTimestamp() {
        if (metadataPath == null || blacklistCsvPath==null || !Files.exists(metadataPath) || !Files.exists(blacklistCsvPath)) {
            return null;
        }

        Properties properties = new Properties();
        try (BufferedReader reader = Files.newBufferedReader(metadataPath, StandardCharsets.UTF_8)) {
            properties.load(reader);
            String epochMillis = properties.getProperty("lastUpdatedEpochMillis");
            if (epochMillis == null || epochMillis.isBlank()) {
                return null;
            }
            return Instant.ofEpochMilli(Long.parseLong(epochMillis));
        } catch (Exception exception) {
            logger.warn("Failed to read threat intel metadata: {}", exception.getMessage());
            return null;
        }
    }

    private void writeLastUpdatedTimestamp(Instant instant) {
        Properties properties = new Properties();
        properties.setProperty("lastUpdatedEpochMillis", Long.toString(instant.toEpochMilli()));

        try (BufferedWriter writer = Files.newBufferedWriter(metadataPath, StandardCharsets.UTF_8)) {
            properties.store(writer, "Threat intel metadata");
        } catch (IOException exception) {
            logger.warn("Failed to write threat intel metadata: {}", exception.getMessage());
        }
    }

    private static String extractPhishTankUrl(String csvLine) {
        if (csvLine == null || csvLine.isBlank() || csvLine.startsWith("phish_id")) {
            return null;
        }

        List<String> columns = parseCsvLine(csvLine, 2);
        if (columns.size() < 2) {
            return null;
        }
        return columns.get(1);
    }

    private static List<String> parseCsvLine(String line, int maxColumns) {
        List<String> columns = new java.util.ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char ch = line.charAt(i);
            if (ch == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    current.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch == ',' && !inQuotes) {
                columns.add(current.toString());
                if (columns.size() >= maxColumns) {
                    return columns;
                }
                current.setLength(0);
            } else {
                current.append(ch);
            }
        }
        columns.add(current.toString());
        return columns;
    }

    private static String normalizeUrl(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return "";
        }
        try {
            URI uri = URI.create(rawUrl);
            String scheme = uri.getScheme();
            String host = uri.getHost();
            int port = uri.getPort();
            String path = uri.getPath();
            String query = uri.getQuery();

            if (host != null) {
                host = host.toLowerCase();
            }

            StringBuilder sb = new StringBuilder();
            if (scheme != null) {
                sb.append(scheme.toLowerCase()).append("://");
            }
            if (host != null) {
                sb.append(host);
            }
            if (port != -1) {
                sb.append(':').append(port);
            }
            if (path != null) {
                sb.append(path);
            }
            if (query != null) {
                sb.append('?').append(query);
            }
            return sb.toString();
        } catch (Exception ignored) {
            return rawUrl.trim().toLowerCase();
        }
    }
}

