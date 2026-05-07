package com.patris.enums;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum statutSinistre {
    DECLARÉ,
    DÉCLARÉ,
    EN_EXPERTISE,
    EN_REPARATION,
    REMBOURSÉ,
    CLÔTURÉ;

    @JsonCreator
    public static statutSinistre from(String value) {
        if (value == null) return null;
        String normalized = value.toUpperCase()
                .replace("É", "E")
                .replace("Ô", "O");
                
        if (normalized.equals("DECLARE") || normalized.equals("DÉCLARÉ")) return DECLARÉ;
        if (normalized.equals("INDEMNISE") || normalized.equals("REMBOURSE")) return REMBOURSÉ;
        if (normalized.equals("EN_INSTRUCTION") || normalized.equals("EN_EXPERTISE")) return EN_EXPERTISE;
        if (normalized.equals("CLASSE") || normalized.equals("CLOTURE")) return CLÔTURÉ;
        if (normalized.equals("REJETE")) return CLÔTURÉ;
        
        try {
            return statutSinistre.valueOf(value.toUpperCase());
        } catch(IllegalArgumentException e) {
            return DECLARÉ;
        }
    }
}