package com.patris.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum statutValidation {

    EN_ATTENTE,
    VALIDE,
    REFUSE,
    REJETE;

    @JsonCreator
    public static statutValidation from(String value) {
        if (value == null) {
            return EN_ATTENTE;
        }

        switch (value.trim().toUpperCase()) {
            case "EN_ATTENTE":
            case "PENDING":
                return EN_ATTENTE;
            case "VALIDE":
            case "VALIDATED":
                return VALIDE;
            case "REFUSE":
            case "REJECTED":
                return REFUSE;
            case "REJETE":
                return REJETE;
            default:
                return EN_ATTENTE;
        }
    }

    @JsonValue
    public String toValue() {
        switch (this) {
            case VALIDE:
                return "VALIDE";
            case REFUSE:
                return "REFUSE";
            case REJETE:
                return "REJETE";
            case EN_ATTENTE:
            default:
                return "EN_ATTENTE";
        }
    }
}
