package com.patris.model;

import java.time.LocalDateTime;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


import jakarta.persistence.Id;


@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "materiel_roulant")
public class MaterielRoulant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String immatriculation;
    private String marque;
    private String modele;
    private String carburant;
    private double kilometrage;
    private LocalDateTime dateVisiteTechnique;
    private LocalDateTime dateAssurance;
    private LocalDateTime dateFinAssurance;
    private Double consommationMoyenne;
    private String numeroAssurance;

    @OneToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    // Getters et Setters
}
