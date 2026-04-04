package com.patris.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Consommable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomProduit;
    private int seuilAlerte;
    private String unite;

    private LocalDate dateEntree;
    private LocalDate dateSortie;

    private String serviceAffiche;

    @ManyToOne
    @JoinColumn(name = "commune_id")
    private Commune commune;


}
