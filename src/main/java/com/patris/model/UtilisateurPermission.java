package com.patris.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Surcharge de permissions pour un utilisateur : accord explicite ({@code accordee=true})
 * ou retrait par rapport au rôle ({@code accordee=false}).
 */
@Entity
@Table(
        name = "utilisateur_permission",
        uniqueConstraints = @UniqueConstraint(columnNames = {"utilisateur_id", "permission_code"})
)
@Getter
@Setter
@NoArgsConstructor
public class UtilisateurPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "utilisateur_id")
    private Utilisateur utilisateur;

    @Column(name = "permission_code", nullable = false, length = 128)
    private String permissionCode;

    /**
     * {@code true} : permission ajoutée au-delà du rôle ;
     * {@code false} : permission retirée par rapport au rôle.
     */
    @Column(nullable = false)
    private boolean accordee = true;

    @Column(name = "accordee_par", length = 128)
    private String accordeePar;

    @Column(name = "date_accord", nullable = false)
    private LocalDateTime dateAccord = LocalDateTime.now();

    @Column(nullable = false, length = 2000)
    private String motif;

    @PrePersist
    public void prePersist() {
        if (dateAccord == null) {
            dateAccord = LocalDateTime.now();
        }
    }
}
