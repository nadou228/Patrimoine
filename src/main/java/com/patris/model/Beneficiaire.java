package com.patris.model;

import com.patris.enums.TypeBeneficiaire;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "beneficiaire")
@Getter
@Setter
@NoArgsConstructor
public class Beneficiaire {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String prenom;
    private String matricule;
    private String fonction;

    @ManyToOne
    @JoinColumn(name = "service_id")
    private Services service;

    private String email;
    private String telephone;

    @Enumerated(EnumType.STRING)
    @Column(name = "type_beneficiaire")
    private TypeBeneficiaire type;

    @Column(nullable = false)
    private boolean actif = true;

    /** Lien optionnel vers un compte utilisateur système. */
    @Column(name = "utilisateur_id")
    private Long utilisateurId;

    public Beneficiaire(String nom, String prenom, String matricule, String fonction, Services service, String email, String telephone, TypeBeneficiaire type) {
        this.nom = nom;
        this.prenom = prenom;
        this.matricule = matricule;
        this.fonction = fonction;
        this.service = service;
        this.email = email;
        this.telephone = telephone;
        this.type = type;
        this.actif = true;
    }
}
