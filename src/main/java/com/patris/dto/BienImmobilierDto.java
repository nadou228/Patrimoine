package com.patris.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class BienImmobilierDto extends BienDto {
    private String titreFoncier;
    private String superficie;
    private String coordonneesGps;
    private String usageImmobilier;
    private Boolean permisOccuper;
    private String statutJuridique;
}
