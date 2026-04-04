package com.patris.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MouvementStockCreateDTO {
    private Long consommableId;
    private LocalDateTime dateOperation;
    private String typeOperation;
    private String pieceJustificative;
    private int quantite;
    private Double prixUnitaire;
    private String observations;
}