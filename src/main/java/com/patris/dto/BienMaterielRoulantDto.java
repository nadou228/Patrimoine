package com.patris.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BienMaterielRoulantDto extends BienDto {
    private String immatriculation;
    private String numChassis;
    private String marque;
    private String modele;
    private String puissanceFiscale;
    private String typeCarburant;
    private String typeBoite;
    private String chargeUtile;
    private String dateProchaineVisiteTechnique;
}
