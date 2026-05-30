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
            .cors(cors -> {}) // Utilise le bean CorsConfigurationSource défini ailleurs
            .csrf(csrf -> csrf.disable())

            .headers(headers -> headers
                .frameOptions(frame -> frame.disable())
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("frame-ancestors 'self' http://localhost:5173")
                )
            )

            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            .authorizeHttpRequests(auth -> auth

                // ENDPOINTS PUBLICS
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/upload/**").permitAll()
                .requestMatchers("/utilisateurs/register").permitAll()
                .requestMatchers("/api/utilisateurs/register").permitAll()
                .requestMatchers("/h2/**").permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/api/biens/scan/**").permitAll()
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // NOMENCLATURE SYSCOHADA — lecture publique (GET) sans authentification
                .requestMatchers(HttpMethod.GET, "/api/v1/nomenclature/**").permitAll()

                // PERMISSIONS ENDPOINT (Authentifié seulement)
                .requestMatchers("/api/permissions/**").authenticated()

                // PARAMETRES SYSTEME
                .requestMatchers(HttpMethod.GET, "/api/admin/system-settings").authenticated()
                .requestMatchers(HttpMethod.PUT, "/api/admin/system-settings").authenticated()

                // ADMIN SYSTEME
                .requestMatchers("/admin/**")
                    .hasAnyRole("ADMIN","SUPERADMIN")

                // MODULE BIENS (IMMOBILIER / MOBILIER / ROULEMENT)
                .requestMatchers(HttpMethod.GET, "/api/biens/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","ELU","AUDITEUR")

                .requestMatchers(HttpMethod.POST, "/api/biens/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","MAGASINIER","RESPONSABLE_PARC_AUTOMOBILE")

                .requestMatchers(HttpMethod.PUT, "/api/biens/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE")

                .requestMatchers(HttpMethod.DELETE, "/api/biens/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","RESPONSABLE_PATRIMOINE")

                // DASHBOARD
                .requestMatchers("/api/dashboard/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","ELU","AUDITEUR")

                // MODULE UTILISATEURS
                .requestMatchers(HttpMethod.GET, "/api/utilisateurs/**")
                    .hasAnyRole("ADMIN", "SUPERADMIN", "GESTIONNAIRE_TECHNIQUE", "RESPONSABLE_PATRIMOINE", "AGENT_INVENTAIRE", "AUDITEUR", "ELU")

                // STOCKS
                .requestMatchers(HttpMethod.GET, "/api/stocks/**")
                    .authenticated()
                .requestMatchers(HttpMethod.GET, "/api/consommables/**")
                    .authenticated()

                .requestMatchers(HttpMethod.POST, "/api/stocks/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE")

                .requestMatchers(HttpMethod.PUT, "/api/stocks/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE")

                .requestMatchers(HttpMethod.DELETE, "/api/stocks/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","RESPONSABLE_PATRIMOINE")

                // AUDIT & LOGS
                .requestMatchers("/api/audit/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AUDITEUR","RESPONSABLE_PATRIMOINE")

                // INVENTAIRES CERTIFIES
                .requestMatchers(HttpMethod.GET, "/api/inventaires/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","ELU","AUDITEUR")

                .requestMatchers(HttpMethod.POST, "/api/inventaires/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE")

                .requestMatchers(HttpMethod.PUT, "/api/inventaires/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","AGENT_INVENTAIRE","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE")

                // REFORME / SORTIE
                .requestMatchers(HttpMethod.GET, "/api/reformes/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER","AUDITEUR")

                .requestMatchers(HttpMethod.POST, "/api/reformes/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER")

                .requestMatchers(HttpMethod.PUT, "/api/reformes/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","RESPONSABLE_PATRIMOINE","RESPONSABLE_FINANCIER")

                .requestMatchers(HttpMethod.DELETE, "/api/reformes/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","RESPONSABLE_PATRIMOINE")


                // AUTRES ENDPOINTS API
                .requestMatchers("/api/**")
                    .hasAnyRole("ADMIN","SUPERADMIN","GESTIONNAIRE_TECHNIQUE","RESPONSABLE_PATRIMOINE")


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
