package com.patris.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import com.patris.model.Utilisateur;
import com.patris.service.EffectivePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JwtService {

    private final EffectivePermissionService effectivePermissionService;

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    private Key key;

    @PostConstruct
    public void init() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "La propriété JWT_SECRET doit contenir au moins 32 caractères UTF-8 pour une clé HS256 sécurisée.");
        }
        key = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Utilisateur utilisateur) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expirationMs);

        List<String> permissionCodes = new ArrayList<>(effectivePermissionService.resolveEffectivePermissionCodes(utilisateur));

        return Jwts.builder()
                .setSubject(utilisateur.getUsername())
                .claim("role", utilisateur.getRole() != null ? utilisateur.getRole().getCode() : "GUEST")
                .claim("id", utilisateur.getId())
                .claim("permissions", permissionCodes)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            return false;
        }
    }

    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parserBuilder().setSigningKey(key).build()
                .parseClaimsJws(token).getBody();
        return claims.getSubject();
    }
}
