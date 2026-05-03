package com.patris.model;

import com.patris.enums.NiveauCategorie;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "categorie_patrimoine")
public class CategoriePatrimoine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String libelle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NiveauCategorie niveau;

    @Column(name = "code_parent")
    private String codeParent;

    private String icone;
    private String couleur;
    private Integer ordre;
    private boolean actif = true;

    @Column(name = "profil_formulaire", columnDefinition = "TEXT")
    private String profilFormulaire;

    public CategoriePatrimoine(String code, String libelle, NiveauCategorie niveau, String codeParent, String icone, String couleur, Integer ordre) {
        this.code = code;
        this.libelle = libelle;
        this.niveau = niveau;
        this.codeParent = codeParent;
        this.icone = icone;
        this.couleur = couleur;
        this.ordre = ordre;
    }
}
