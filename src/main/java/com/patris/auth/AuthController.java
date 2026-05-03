package com.patris.auth;

import com.patris.dto.LoginRequest;
import com.patris.dto.LoginResponse;
import com.patris.model.Utilisateur;
import com.patris.security.CustomUserDetails;
import com.patris.security.JwtService;
import com.patris.service.EffectivePermissionService;
import com.patris.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;

@RestController
@RequestMapping({"/auth", "/api/auth"})
@RequiredArgsConstructor
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UtilisateurService utilisateurService;
    private final EffectivePermissionService effectivePermissionService;

    /**
     * Authentifie l'utilisateur et retourne un JWT. Met à jour la date de dernière connexion.
     */
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        log.debug("Tentative de connexion pour l'utilisateur : {}", request.getUsername());
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Utilisateur user = userDetails.getUtilisateur();

            utilisateurService.recordSuccessfulLogin(user.getId());

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
}
