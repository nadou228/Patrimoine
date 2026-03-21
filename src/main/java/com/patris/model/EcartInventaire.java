package com.patris.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Table(name = "ecart_inventaire")
public class EcartInventaire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "campagne_id")
    private CampagneInventaire campagne;

    @ManyToOne
    @JoinColumn(name = "bien_id", nullable = true)
    private Bien bien;
    
    private String typeEcart; // "Manquant", "Non enregistré", "Mauvaise affectation", "Différence de valeur"
    
    @Column(columnDefinition = "TEXT")
    private String descriptionEcart;

    private String statutTraitement; // "En attente", "Régularisé", "Réformé"
    private String justification;
    private LocalDateTime dateResolution;
    private String resoluPar;
}
