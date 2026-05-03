package com.patris.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class IdentificationDto {
    private String iup;
    private String designation;
    private String codeBarre;
    private String qrCodeUrl;
    private String service;
    private String localisation;
    private String dateIdentification;
}
