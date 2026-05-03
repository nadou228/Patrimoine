package com.patris.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BienMobilierDto extends BienDto {
    private String numSerie;
    private String fabricant;
    private String specificationsTechniques;
    private String finGarantie;
    private String dateDernierEntretien;
    private String dateProchaineMaintenance;
}
