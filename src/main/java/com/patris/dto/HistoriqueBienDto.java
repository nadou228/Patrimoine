package com.patris.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoriqueBienDto {
    private LocalDateTime date;
    private String typeEvenement; // ex: AFFECTATION, SINISTRE, ENTRETIEN, MOUVEMENT, AUDIT
    private String description;
    private String utilisateur;
    private String details;
}
