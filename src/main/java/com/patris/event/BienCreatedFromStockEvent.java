package com.patris.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

@Getter
public class BienCreatedFromStockEvent extends ApplicationEvent {
    private final Long bienId;
    private final Long stockId;
    private final int quantite;
    /** Bénéficiaire obligatoire pour la sortie de stock associée à l'immobilisation. */
    private final Long beneficiaireId;

    public BienCreatedFromStockEvent(Object source, Long bienId, Long stockId, int quantite, Long beneficiaireId) {
        super(source);
        this.bienId = bienId;
        this.stockId = stockId;
        this.quantite = quantite;
        this.beneficiaireId = beneficiaireId;
    }
}
