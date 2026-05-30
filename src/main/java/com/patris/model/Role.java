package com.patris.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
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

    public Role() {}

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

    // --- Getters ---
    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getLibelle() { return libelle; }
    public String getDescription() { return description; }
    public boolean isSystemRole() { return systemRole; }
    public boolean isActif() { return actif; }
    public LocalDateTime getDateCreation() { return dateCreation; }
    public Set<Permission> getPermissions() { return permissions; }

    // --- Setters ---
    public void setId(Long id) { this.id = id; }
    public void setCode(String code) { this.code = code; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public void setDescription(String description) { this.description = description; }
    public void setSystemRole(boolean systemRole) { this.systemRole = systemRole; }
    public void setActif(boolean actif) { this.actif = actif; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
    public void setPermissions(Set<Permission> permissions) { this.permissions = permissions; }
}
