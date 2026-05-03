package com.patris.dto;

import com.patris.enums.NiveauCategorie;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class CategoriePatrimoineDto {
    private Long id;
    private String code;
    private String libelle;
    private NiveauCategorie niveau;
    private String codeParent;
    private String icone;
    private String couleur;
    private Integer ordre;
    private boolean actif;
    
    private List<CategoriePatrimoineDto> enfants = new ArrayList<>();
}
