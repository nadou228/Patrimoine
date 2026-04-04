package com.patris.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AffectationDto {
    private Long id;
    private String bien; // Libellé ou ID du bien
    private String detenteur;
    private String service; // Nom ou ID du service
    private String dateAffectation;
    private String motif;
    private String fonction;
    private String dateFin;
    private String etat;
}
