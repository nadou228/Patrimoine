package com.patris.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "nomenclature_compte")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class NomenclatureCompte {

    @Id
    @Column(length = 20)
    private String code; // e.g., "241.011"

    @Column(columnDefinition = "TEXT")
    private String intitule;

    @Column(length = 1)
    private String partie; // 'A' or 'B'

    @Column(name = "compte_principal", length = 3)
    private String comptePrincipal; // e.g., "241"

    @Column(name = "libelle_compte", columnDefinition = "TEXT")
    private String libelleCompte;

    @Column(length = 150)
    private String categorie;

    @Column(length = 20)
    private String niveau; // ARTICLE, FAMILLE

    @Column(name = "code_parent", length = 20)
    private String codeParent;

    @Column(length = 50)
    private String section; // IMMOBILISATION, CONSOMMABLE

    @Column(name = "categorie_principale", length = 150)
    private String categoriePrincipale;

    @Column(name = "categorie_metier", length = 150)
    private String categorieMetier;

    @Column(length = 150)
    private String famille;

    @Column(name = "type_bien", length = 20)
    private String typeBien; // "immobilisation", "consommable", "entretien"

    @Column(name = "unite_defaut", length = 30)
    private String uniteDefaut;

    private boolean actif = true;
}
