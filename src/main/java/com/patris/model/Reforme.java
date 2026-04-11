package com.patris.model;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "reforme")
public class Reforme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    private String typeReforme; // REBUT, VENTE, DON, CESSION
    private String motif;
    private String rapportTechniqueUrl;
    private Double valeurResiduelle;
    private String decision;
    private LocalDate dateReforme;
    private String statut; // EN_COURS, VALIDE, REJETE
}

