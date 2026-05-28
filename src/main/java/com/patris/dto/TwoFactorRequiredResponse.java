package com.patris.dto;

/**
 * Réponse retournée par POST /api/auth/login
 * quand la 2FA est activée pour l'utilisateur.
 */
public class TwoFactorRequiredResponse {
    private boolean requiresTwoFactor;
    private String tempToken; // token court-vie pour la seconde étape

    public TwoFactorRequiredResponse(String tempToken) {
        this.requiresTwoFactor = true;
        this.tempToken = tempToken;
    }

    public boolean isRequiresTwoFactor() { return requiresTwoFactor; }
    public String getTempToken() { return tempToken; }
}
