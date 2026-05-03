package com.patris.model;

import jakarta.persistence.Entity;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "bien_immobilier")
@PrimaryKeyJoinColumn(name = "id")
@Getter
@Setter
public class BienImmobilier extends Bien {

    private String titreFoncier;
    private String superficie;
    private String coordonneesGps;
    private String usageImmobilier;
    private Boolean permisOccuper;
    private String statutJuridique; // PUBLIC / PRIVE / BAIL

    @ManyToOne
    @jakarta.persistence.JoinColumn(name = "bail_id")
    private Bail bail;

    public BienImmobilier() {
        super();
        this.permisOccuper = false;
    }
}
