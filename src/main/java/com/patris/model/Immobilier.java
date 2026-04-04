package com.patris.model;

import jakarta.persistence.*;
import lombok.*;

import jakarta.persistence.Id;

@Entity
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "immobilier")
public class Immobilier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double superficie;
    private String statutFoncier;
    private String usage;
    private String adresse;
    private String coordonneeGps;

    @OneToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

}
