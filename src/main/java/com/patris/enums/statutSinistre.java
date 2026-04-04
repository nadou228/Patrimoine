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
        String normalized = value.toUpperCase().replace("É", "E");
        if (normalized.equals("DECLARE")) return DECLARÉ;
        return statutSinistre.valueOf(value.toUpperCase());
    }
}