package com.patris.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EtiquetteDto {
    private String iup;
    private String designation;
    private String categorie;
    private String service;
    private String localisation;
    private String dateAcquisition;
    private String valeur;
    private String qrCodeBase64;
    private String logoMinistere; // URL ou Base64
}
