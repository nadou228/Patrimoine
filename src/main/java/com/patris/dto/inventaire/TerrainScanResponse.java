package com.patris.dto.inventaire;

import java.util.ArrayList;
import java.util.List;

import com.patris.model.Bien;
import com.patris.model.InventaireFiche;

public class TerrainScanResponse {

    private String iup;
    private Bien bien;
    private InventaireFiche fiche;
    private boolean inCampaignScope;
    private boolean dejaRecense;
    private List<String> alertes = new ArrayList<>();

    public String getIup() { return iup; }
    public void setIup(String iup) { this.iup = iup; }

    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }

    public InventaireFiche getFiche() { return fiche; }
    public void setFiche(InventaireFiche fiche) { this.fiche = fiche; }

    public boolean isInCampaignScope() { return inCampaignScope; }
    public void setInCampaignScope(boolean inCampaignScope) { this.inCampaignScope = inCampaignScope; }

    public boolean isDejaRecense() { return dejaRecense; }
    public void setDejaRecense(boolean dejaRecense) { this.dejaRecense = dejaRecense; }

    public List<String> getAlertes() { return alertes; }
    public void setAlertes(List<String> alertes) { this.alertes = alertes; }

    public void addAlerte(String message) { this.alertes.add(message); }
}
