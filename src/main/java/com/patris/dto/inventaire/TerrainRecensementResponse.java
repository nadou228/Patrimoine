package com.patris.dto.inventaire;

import java.util.ArrayList;
import java.util.List;

import com.patris.model.InventaireEcart;
import com.patris.model.InventaireFiche;

public class TerrainRecensementResponse {

    private InventaireFiche fiche;
    private List<InventaireEcart> ecartsGeneres = new ArrayList<>();
    private List<String> alertes = new ArrayList<>();

    public InventaireFiche getFiche() { return fiche; }
    public void setFiche(InventaireFiche fiche) { this.fiche = fiche; }

    public List<InventaireEcart> getEcartsGeneres() { return ecartsGeneres; }
    public void setEcartsGeneres(List<InventaireEcart> ecartsGeneres) { this.ecartsGeneres = ecartsGeneres; }

    public List<String> getAlertes() { return alertes; }
    public void setAlertes(List<String> alertes) { this.alertes = alertes; }

    public void addAlerte(String message) { this.alertes.add(message); }
    public void addEcart(InventaireEcart ecart) { this.ecartsGeneres.add(ecart); }
}
