package com.patris.dto.admin;

/**
 * Accorder ou retirer une permission directe sur un utilisateur.
 */
public class DirectPermissionRequest {
    private String permission;
    private boolean accordee = true;
    private String motif;

    public DirectPermissionRequest() {}

    // --- Getters ---
    public String getPermission() { return permission; }
    public boolean isAccordee() { return accordee; }
    public String getMotif() { return motif; }

    // --- Setters ---
    public void setPermission(String permission) { this.permission = permission; }
    public void setAccordee(boolean accordee) { this.accordee = accordee; }
    public void setMotif(String motif) { this.motif = motif; }
}
