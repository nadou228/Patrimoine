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
@Table(name = "campagne_inventaire")
public class CampagneInventaire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String reference; // ex: INV-2026-01
    private String libelle;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String statut; // Planifiée, En cours, Clôturée, Certifiée
    private String responsable;
    private String sitesCouverts;
    
    @Column(columnDefinition = "TEXT")
    private String rapportCertifieUrl;
}
