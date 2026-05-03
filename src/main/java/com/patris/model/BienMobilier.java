package com.patris.model;

import jakarta.persistence.Entity;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "bien_mobilier")
@PrimaryKeyJoinColumn(name = "id")
@Getter
@Setter
public class BienMobilier extends Bien {

    private String numSerie;
    private String fabricant;
    private String specificationsTechniques;
    private LocalDate finGarantie;
    private LocalDate dateDernierEntretien;
    private LocalDate dateProchaineMaintenance;

    public BienMobilier() {
        super();
    }
}
