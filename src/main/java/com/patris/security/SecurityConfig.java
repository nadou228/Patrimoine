package com.patris.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        JwtAuthenticationFilter jwtFilter =
                new JwtAuthenticationFilter(jwtService, customUserDetailsService);

        http
            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            .authorizeHttpRequests(auth -> auth

                // ENDPOINTS PUBLICS
                .requestMatchers("/auth/login").permitAll()
                .requestMatchers("/utilisateurs/register").permitAll()

                // ADMIN SYSTEME
                .requestMatchers("/admin/**")
                    .hasRole("ADMIN")

                // MODULE BIENS (IMMOBILIER / MOBILIER / ROULEMENT)
                .requestMatchers(HttpMethod.GET, "/api/biens/**")
                    .hasAnyRole("ADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","ELU","AUDITEUR")

                .requestMatchers(HttpMethod.POST, "/api/biens/**")
                    .hasAnyRole("ADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE")

                .requestMatchers(HttpMethod.PUT, "/api/biens/**")
                    .hasAnyRole("ADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE")

                .requestMatchers(HttpMethod.DELETE, "/api/biens/**")
                    .hasAnyRole("ADMIN","RESPONSABLE_PATRIMOINE")

                // DASHBOARD
                .requestMatchers("/api/dashboard/**")
                    .hasAnyRole("ADMIN","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","ELU","AUDITEUR")

                // STOCKS
                .requestMatchers(HttpMethod.GET, "/api/stocks/**")
                    .hasAnyRole("ADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","AUDITEUR")

                .requestMatchers(HttpMethod.POST, "/api/stocks/**")
                    .hasAnyRole("ADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE")

                .requestMatchers(HttpMethod.PUT, "/api/stocks/**")
                    .hasAnyRole("ADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE")

                .requestMatchers(HttpMethod.DELETE, "/api/stocks/**")
                    .hasAnyRole("ADMIN","RESPONSABLE_PATRIMOINE")

                // AUDIT & LOGS
                .requestMatchers("/api/audit/**")
                    .hasAnyRole("ADMIN","AUDITEUR")

                // AUTRES ENDPOINTS API
                .requestMatchers("/api/**")
                    .hasAnyRole("ADMIN","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE")


                // TOUT LE RESTE
                .anyRequest().authenticated()
            )

            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // PASSWORD ENCODER
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // AUTH MANAGER
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}