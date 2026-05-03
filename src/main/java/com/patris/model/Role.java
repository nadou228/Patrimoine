package com.patris.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String libelle;

    private String description;

    @Column(name = "system_role")
    private boolean systemRole = false;

    @Column(nullable = false)
    private boolean actif = true;

    private LocalDateTime dateCreation;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "role_permissions",
        joinColumns = @JoinColumn(name = "role_id"),
        inverseJoinColumns = @JoinColumn(name = "permission_id")
    )
    private Set<Permission> permissions = new HashSet<>();

    public Role(String code, String libelle, String description, boolean systemRole) {
        this.code = code;
        this.libelle = libelle;
        this.description = description;
        this.systemRole = systemRole;
        this.actif = true;
    }

    @PrePersist
    public void prePersistRole() {
        if (dateCreation == null) {
            dateCreation = LocalDateTime.now();
        }
    }
}
