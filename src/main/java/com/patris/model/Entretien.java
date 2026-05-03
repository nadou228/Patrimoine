package com.patris.model;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "entretien")
public class Entretien {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private LocalDate datePrevue;
    
    private LocalDate dateRealisee;
    
    private Double cout;
    
    private String prestataire;

    private String type;

    private String observation;

    private String description;

    private String rapportUrl;

    private String statut;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    
} 
