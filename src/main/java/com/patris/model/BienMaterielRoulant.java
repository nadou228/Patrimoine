package com.patris.model;

import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "bien_materiel_roulant")
@PrimaryKeyJoinColumn(name = "id")
@Getter
@Setter
public class BienMaterielRoulant extends Bien {

    private String immatriculation;
    private String numChassis;
    private String marque;
    private String modele;
    private String puissanceFiscale;
    private String typeCarburant;
    private String typeBoite; // MANUELLE / AUTO
    private String chargeUtile; // Pour Roulant (ex: 3.5 Tonnes)
    private LocalDate dateProchaineVisiteTechnique;

    public BienMaterielRoulant() {
        super();
    }
}
