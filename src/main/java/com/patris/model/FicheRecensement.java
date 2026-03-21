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
@Table(name = "fiche_recensement")
public class FicheRecensement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "campagne_id")
    private CampagneInventaire campagne;

    private String iupScanne; // CodeQR ou IUP lu

    @ManyToOne
    @JoinColumn(name = "bien_id", nullable = true)
    private Bien bienTheorique;

    private String etatConstate;
    private String localisationConstatee;
    
    @Column(columnDefinition = "TEXT")
    private String photoPreuveUrl;
    
    private String observation;
    private String latitude;
    private String longitude;
    
    private LocalDateTime dateScan;
    private String agentInventaire;
    
    private Boolean validationSuperviseur;
    private String superviseur;
    private LocalDateTime dateValidation;
}
