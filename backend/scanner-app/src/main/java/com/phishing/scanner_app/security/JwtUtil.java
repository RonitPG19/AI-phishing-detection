package com.phishing.scanner_app.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    private final SecretKey key;
    private final Duration expiration;

    public JwtUtil(@Value("${jwt.secret}") String secret,
                   @Value("${jwt.expiration:PT24H}") Duration expiration) {
        byte[] secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalArgumentException("jwt.secret must be at least 32 bytes for HS256/HS384/HS512 signing");
        }
        this.key = Keys.hmacShaKeyFor(secretBytes);
        this.expiration = expiration;
    }

    /**
     * Issues an application JWT used by this API after external authentication succeeds.
     *
     * @param uid stable application user identifier
     * @param role application role without ROLE_ prefix
     * @param claims additional non-sensitive user claims
     * @return signed JWT
     */
    public String generateToken(String uid, String role, Map<String, ?> claims) {
        Instant now = Instant.now();

        JwtBuilder builder = Jwts.builder()
                .setSubject(uid)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plus(expiration)))
                .claim("uid", uid)
                .claim("role", role.toUpperCase());

        claims.forEach(builder::claim);

        return builder.signWith(key, SignatureAlgorithm.HS256).compact();
    }

    public Claims validateToken(String token) {
        try {
            return Jwts.parserBuilder()
                    .setSigningKey(key)
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

        } catch (ExpiredJwtException e) {
            throw new RuntimeException("Token expired");
        } catch (JwtException e) {
            throw new RuntimeException("Invalid token");
        }
    }

    public String getRole(String token) {
        String role = validateToken(token).get("role", String.class);
        return role != null ? role.toUpperCase() : null;
    }

    public String getUid(String token) {
        return validateToken(token).get("uid", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            validateToken(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
