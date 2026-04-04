package com.patris.model;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "sinistre")
public class Sinistre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String dateSinistre;
    private String type;
    private Double montantEstime;
    private Double montantRembourse;
    private String description;
    
    private String referenceAssurance;
    private String lieuSinistre;
    private java.time.LocalDate dateCloture;
    
    @Enumerated(EnumType.STRING)
    private com.patris.enums.statutSinistre statut;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;
}
