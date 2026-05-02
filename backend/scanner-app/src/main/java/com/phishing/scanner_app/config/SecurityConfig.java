package com.phishing.scanner_app.config;

import com.phishing.scanner_app.security.JwtAuthFilter;
import com.phishing.scanner_app.security.JwtUtil;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtUtil jwtUtil) {
        return new JwtAuthFilter(jwtUtil);
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthFilter jwtAuthFilter) throws Exception {

        http
            .csrf(csrf -> csrf.disable())
            .cors(Customizer.withDefaults())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/public/**", "/actuator/health", "/actuator/info").permitAll()

                // Only ADMIN
                .requestMatchers("/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/phishing/reports").hasRole("ADMIN")

                // USER or ADMIN
                .requestMatchers("/user/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/phishing/scan").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/phishing/history/**").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/phishing/flags/mine").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/phishing/reports/*").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/phishing/reports/*/flags").hasAnyRole("USER", "ADMIN")
                .requestMatchers("/api/phishing/reports/*/findings/*/flags").hasAnyRole("USER", "ADMIN")

                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
