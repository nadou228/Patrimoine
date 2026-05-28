package com.patris.auth;

import com.patris.dto.LoginRequest;
import com.patris.dto.LoginResponse;
import com.patris.dto.TwoFactorRequiredResponse;
import com.patris.model.Utilisateur;
import com.patris.repository.UtilisateurRepository;
import com.patris.security.CustomUserDetails;
import com.patris.security.JwtService;
import com.patris.service.EffectivePermissionService;
import com.patris.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Map;

@RestController
@RequestMapping({"/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UtilisateurService utilisateurService;
    private final EffectivePermissionService effectivePermissionService;
    private final TwoFactorService twoFactorService;
    private final UtilisateurRepository utilisateurRepository;

    /**
     * Authentifie l'utilisateur.
     * - Si 2FA désactivée → retourne le JWT complet directement.
     * - Si 2FA activée → retourne { requiresTwoFactor: true, tempToken: "..." }
     *   Le tempToken est un JWT court (~5min) utilisé seulement pour valider le code TOTP.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        log.debug("Tentative de connexion pour l'utilisateur : {}", request.getUsername());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Utilisateur user = userDetails.getUtilisateur();

            utilisateurService.recordSuccessfulLogin(user.getId());

            // 2FA activée → retourner un signal au frontend
            if (user.isTwoFactorEnabled() && user.getTwoFactorSecret() != null) {
                // Token temporaire (5 min) uniquement pour la vérification du code TOTP
                String tempToken = jwtService.generateTempToken(user);
                log.debug("2FA requise pour {}, tempToken émis.", user.getUsername());
                return ResponseEntity.ok(new TwoFactorRequiredResponse(tempToken));
            }

            // Pas de 2FA → connexion directe
            String token = jwtService.generateToken(user);
            log.debug("Connexion réussie pour l'utilisateur {}", user.getUsername());

            LoginResponse response = new LoginResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getNom(),
                    user.getRole() != null ? user.getRole().getCode() : "GUEST",
                    token,
                    new ArrayList<>(effectivePermissionService.resolveEffectivePermissionCodes(user))
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.warn("Échec de connexion pour {} : {}", request.getUsername(), e.getMessage());
            return ResponseEntity.status(401).build();
        }
    }

    /**
     * Vérifie le code TOTP et, si valide, retourne le JWT complet.
     * Le tempToken (passé en Authorization Bearer) identifie l'utilisateur.
     */
    @PostMapping("/2fa/verify")
    public ResponseEntity<?> verifyTwoFactor(
            @RequestBody Map<String, Object> body,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            String tempToken = authHeader.replace("Bearer ", "");
            String username = jwtService.extractUsername(tempToken);
            int code = (Integer) body.get("code");

            Utilisateur user = utilisateurRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            if (!twoFactorService.verifyCode(user.getTwoFactorSecret(), code)) {
                return ResponseEntity.status(401).body(Map.of("error", "Code TOTP invalide"));
            }

            // Code valide → émettre le vrai JWT complet
            String token = jwtService.generateToken(user);

            LoginResponse response = new LoginResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getNom(),
                    user.getRole() != null ? user.getRole().getCode() : "GUEST",
                    token,
                    new ArrayList<>(effectivePermissionService.resolveEffectivePermissionCodes(user))
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.warn("Échec vérification 2FA : {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Vérification échouée"));
        }
    }

    /**
     * Configure la 2FA pour l'utilisateur connecté.
     * Retourne { secret, qrCode (base64 PNG) }
     */
    @PostMapping("/2fa/setup")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> setupTwoFactor(Principal principal) {
        try {
            Utilisateur user = utilisateurRepository.findByUsername(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            String secret = twoFactorService.generateSecret();
            String qrCode = twoFactorService.generateQrCodeBase64(user.getUsername(), secret);

            // Ne pas encore activer — le frontend doit confirmer avec un code valide
            return ResponseEntity.ok(Map.of(
                    "secret", secret,
                    "qrCode", qrCode,
                    "issuer", "PATRIS-SIGP"
            ));
        } catch (Exception e) {
            log.error("Erreur setup 2FA : {}", e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Confirme et active la 2FA après vérification d'un premier code TOTP valide.
     * Body: { secret, code }
     */
    @PostMapping("/2fa/confirm")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> confirmTwoFactor(@RequestBody Map<String, Object> body, Principal principal) {
        try {
            String secret = (String) body.get("secret");
            int code = (Integer) body.get("code");

            if (!twoFactorService.verifyCode(secret, code)) {
                return ResponseEntity.status(400).body(Map.of("error", "Code TOTP invalide. Vérifiez votre application."));
            }

            Utilisateur user = utilisateurRepository.findByUsername(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            twoFactorService.enableTwoFactor(user, secret);
            log.info("2FA activée pour l'utilisateur {}", user.getUsername());

            return ResponseEntity.ok(Map.of("message", "2FA activée avec succès", "enabled", true));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Désactive la 2FA pour l'utilisateur connecté.
     */
    @DeleteMapping("/2fa/disable")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> disableTwoFactor(Principal principal) {
        try {
            Utilisateur user = utilisateurRepository.findByUsername(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Utilisateur introuvable"));

            twoFactorService.disableTwoFactor(user);
            return ResponseEntity.ok(Map.of("message", "2FA désactivée", "enabled", false));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}
