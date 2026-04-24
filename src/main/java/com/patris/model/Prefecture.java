package com.patris.model;


import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "prefectures")
public class Prefecture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomPrefecture;

    @ManyToOne
    @JoinColumn(name = "region_id")
    private Region region;

    public Prefecture() {}

    public Prefecture(Long id, String nomPrefecture, Region region) {
        this.id = id;
        this.nomPrefecture = nomPrefecture;
        this.region = region;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomPrefecture() { return nomPrefecture; }
    public void setNomPrefecture(String nomPrefecture) { this.nomPrefecture = nomPrefecture; }
    public Region getRegion() { return region; }
    public void setRegion(Region region) { this.region = region; }
}
