package com.patris.security;

import com.patris.model.Utilisateur;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;

/**
 * Détails utilisateur pour Spring Security : autorités pré-calculées (rôle + permissions effectives).
 */
public class CustomUserDetails implements UserDetails {

    private final Utilisateur utilisateur;
    private final Collection<? extends GrantedAuthority> authorities;

    public CustomUserDetails(Utilisateur utilisateur, Collection<? extends GrantedAuthority> authorities) {
        this.utilisateur = utilisateur;
        this.authorities = authorities;
    }

    /** Retourne l'entité Utilisateur associée. */
    public Utilisateur getUtilisateur() {
        return utilisateur;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getPassword() {
        return utilisateur.getPassword();
    }

    @Override
    public String getUsername() {
        return utilisateur.getUsername();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return utilisateur.getStatut() == com.patris.enums.StatutUtilisateur.ACTIF;
    }
}
