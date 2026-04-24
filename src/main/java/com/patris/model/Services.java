package com.patris.model;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Id;

@Entity
public class Services {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "nom_service")
    private String nomService;

    @ManyToOne
    @JoinColumn(name = "region_id")
    private Region region;

    public Services() {}

    public Services(Long id, String nomService, Region region) {
        this.id = id;
        this.nomService = nomService;
        this.region = region;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomService() { return nomService; }
    public void setNomService(String nomService) { this.nomService = nomService; }
    public Region getRegion() { return region; }
    public void setRegion(Region region) { this.region = region; }
}
