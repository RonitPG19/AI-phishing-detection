package com.phishing.scanner_app;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.io.IOException;
import java.util.Collections;

public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;

    public JwtAuthFilter(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);

            if (JwtUtil.isTokenValid(token)) {

                String username = JwtUtil.getUsername(token);

                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                Collections.emptyList()
                        );

                SecurityContextHolder.getContext().setAuthentication(auth);

            } else {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }

if (JwtUtil.isTokenValid(token)) {

    String username = JwtUtil.getUsername(token);
    String role = JwtUtil.getRole(token);

    // IMPORTANT: Spring expects "ROLE_" prefix
    SimpleGrantedAuthority authority =
            new SimpleGrantedAuthority("ROLE_" + role);

    UsernamePasswordAuthenticationToken auth =
            new UsernamePasswordAuthenticationToken(
                    username,
                    null,
                    List.of(authority)
            );

    SecurityContextHolder.getContext().setAuthentication(auth);
}

        filterChain.doFilter(request, response);
    }
}