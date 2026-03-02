package com.patris.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.patris.dto.LoginRequest;
import com.patris.dto.LoginResponse;
import com.patris.security.JwtService;
import com.patris.security.CustomUserDetails;
import com.patris.model.Utilisateur;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            Utilisateur user = userDetails.getUtilisateur();

            String token = jwtService.generateToken(user);

            LoginResponse response = new LoginResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getNom(),
                    user.getRole().name(),
                    token
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(401).build();
        }
    }
}