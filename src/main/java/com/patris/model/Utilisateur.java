package com.patris.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.persistence.*;
import lombok.*;
import com.patris.enums.role;

@Entity
@Getter
@Setter
@NoArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Utilisateur {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;

    private String prenom;

    private String fonction;

    @Column(unique = true)
    private String username;

    @Column(unique = true)
    private String email;

    private String telephone;

    private String password;

    @Enumerated(EnumType.STRING)
    private role role;

    private boolean twoFactorEnabled = false;
    
}
