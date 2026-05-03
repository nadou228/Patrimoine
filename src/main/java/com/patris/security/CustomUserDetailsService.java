package com.patris.security;

import com.patris.model.Utilisateur;
import com.patris.repository.UtilisateurRepository;
import com.patris.service.EffectivePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UtilisateurRepository utilisateurRepository;
    private final EffectivePermissionService effectivePermissionService;

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        Utilisateur utilisateur = utilisateurRepository.findByUsername(usernameOrEmail)
                .or(() -> utilisateurRepository.findByEmail(usernameOrEmail))
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + usernameOrEmail));

        if (utilisateur.isArchived()) {
            throw new UsernameNotFoundException("Ce compte n'est plus actif.");
        }

        List<GrantedAuthority> authorities = new ArrayList<>();
        if (utilisateur.getRole() != null) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + utilisateur.getRole().getCode()));
        }
        for (String code : effectivePermissionService.resolveEffectivePermissionCodes(utilisateur)) {
            authorities.add(new SimpleGrantedAuthority(code));
        }

        return new CustomUserDetails(utilisateur, authorities);
    }
}
