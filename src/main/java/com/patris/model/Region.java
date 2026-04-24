package com.patris.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "region")
public class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomRegion;

    public Region() {}

    public Region(Long id, String nomRegion) {
        this.id = id;
        this.nomRegion = nomRegion;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomRegion() { return nomRegion; }
    public void setNomRegion(String nomRegion) { this.nomRegion = nomRegion; }
}
