package com.patris.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "stock")
public class Stock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private int quantite;
    private int seuilAlerte;
    private String unite;
    private Double prixUnitaireMoyen = 0.0;

    @ManyToOne
    @JoinColumn(name = "consommable_id")
    private Consommable consommable;

    @ManyToOne
    @JoinColumn(name = "magasin_id")
    private Magasin magasin;
}
