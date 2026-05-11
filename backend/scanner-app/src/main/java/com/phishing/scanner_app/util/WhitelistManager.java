package com.phishing.scanner_app.util;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class WhitelistManager {

    private static final Logger logger = LoggerFactory.getLogger(WhitelistManager.class);

    // Free-mail providers are not strong trust signals for sender allow-listing.
    private static final Set<String> FREE_EMAIL_PROVIDERS = Set.of(
        "gmail.com", "yahoo.com", "hotmail.com", "outlook.com",
        "aol.com", "proton.me", "icloud.com", "mail.com", "zoho.com", "vercel.com"
    );

    private final ResourceLoader resourceLoader;
    private final AtomicReference<Set<String>> whitelistRef = new AtomicReference<>(Set.of());

    @Value("${scanner.whitelist.sources:classpath:top-1m-Tranco.csv,classpath:top-1m-umbrella.csv}")
    private String whitelistSources;

    @Value("${scanner.whitelist.max-candidates:200}")
    private int maxCandidates;

    @Value("${scanner.whitelist.max-domains:100}")
    private int maxDomains;

    public WhitelistManager(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void initialize() {
        reload();
    }

    public synchronized void reload() {
        Set<String> loaded = new LinkedHashSet<>();
        String[] sources = whitelistSources.split(",");

        for (String source : sources) {
            if (loaded.size() >= maxDomains) {
                break;
            }
            loadFilteredWhitelist(source.trim(), loaded);
        }

        whitelistRef.set(Collections.unmodifiableSet(loaded));
        logger.info("Whitelist loaded with {} domains", loaded.size());
    }

    public Set<String> getWhitelistedDomains() {
        return whitelistRef.get();
    }

    public boolean isWhitelistedDomain(String domain) {
        if (domain == null || domain.isBlank()) {
            return false;
        }
        String normalized = normalizeDomain(domain);
        Set<String> whitelist = whitelistRef.get();
        return whitelist.contains(normalized) || whitelist.contains(extractRootDomain(normalized));
    }

    private void loadFilteredWhitelist(String source, Set<String> collector) {
        Resource resource = resourceLoader.getResource(source);
        if (!resource.exists()) {
            logger.warn("Whitelist source not found: {}", source);
            return;
        }

        int scannedRows = 0;
        try (InputStream inputStream = resource.getInputStream();
             BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null && scannedRows < maxCandidates && collector.size() < maxDomains) {
                scannedRows++;
                String[] parts = line.split(",");
                if (parts.length < 2) {
                    continue;
                }

                String domain = normalizeDomain(parts[1].trim());
                if (domain.isEmpty()) {
                    continue;
                }

                if (!FREE_EMAIL_PROVIDERS.contains(domain)) {
                    collector.add(domain);
                }
            }
        } catch (IOException exception) {
            logger.warn("Failed to load whitelist source {}: {}", source, exception.getMessage());
        }
    }

    private static String normalizeDomain(String domain) {
        return domain.toLowerCase(Locale.ROOT);
    }

    private static String extractRootDomain(String domain) {
        String[] parts = domain.split("\\.");
        if (parts.length < 2) {
            return domain;
        }
        return parts[parts.length - 2] + "." + parts[parts.length - 1];
    }
}
