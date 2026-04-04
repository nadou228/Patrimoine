package com.patris.model;

import java.time.LocalDateTime;

import com.patris.enums.statutValidation;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "inventaire_fiche")
public class InventaireFiche {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "campagne_id")
    private InventaireCampagne campagne;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    private String codeIup;
    private String etatConstate;
    private String localisationReelle;
    private String photoUrl;
    private String coordonneeGps;
    private String observation;
    private Boolean anomalie;

    @Enumerated(EnumType.STRING)
    private statutValidation validationAgent;

    @Enumerated(EnumType.STRING)
    private statutValidation validationSuperviseur;

    private String agentUsername;
    private String superviseurUsername;
    private LocalDateTime dateScan;
}
