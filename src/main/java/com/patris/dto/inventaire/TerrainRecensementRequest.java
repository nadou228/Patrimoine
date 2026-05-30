package com.patris.dto.inventaire;

public class TerrainRecensementRequest {

    private Long campagneId;
    private String iup;
    private String etatConstate;
    private String localisationReelle;
    private String photoUrl;
    private String coordonneeGps;
    private String observation;
    private Boolean anomalie;
    private Boolean validerAgent;

    public Long getCampagneId() { return campagneId; }
    public void setCampagneId(Long campagneId) { this.campagneId = campagneId; }

    public String getIup() { return iup; }
    public void setIup(String iup) { this.iup = iup; }

    public String getEtatConstate() { return etatConstate; }
    public void setEtatConstate(String etatConstate) { this.etatConstate = etatConstate; }

    public String getLocalisationReelle() { return localisationReelle; }
    public void setLocalisationReelle(String localisationReelle) { this.localisationReelle = localisationReelle; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public String getCoordonneeGps() { return coordonneeGps; }
    public void setCoordonneeGps(String coordonneeGps) { this.coordonneeGps = coordonneeGps; }

    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }

    public Boolean getAnomalie() { return anomalie; }
    public void setAnomalie(Boolean anomalie) { this.anomalie = anomalie; }

    public Boolean getValiderAgent() { return validerAgent; }
    public void setValiderAgent(Boolean validerAgent) { this.validerAgent = validerAgent; }
}
