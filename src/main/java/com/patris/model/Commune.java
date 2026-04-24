package com.patris.model;


import jakarta.persistence.*;

@Entity
@Table(name = "commune")
public class Commune {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nomCommune;

    @ManyToOne
    @JoinColumn(name = "prefecture_id")
    private Prefecture prefecture;

    public Commune() {}

    public Commune(Long id, String nomCommune, Prefecture prefecture) {
        this.id = id;
        this.nomCommune = nomCommune;
        this.prefecture = prefecture;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomCommune() { return nomCommune; }
    public void setNomCommune(String nomCommune) { this.nomCommune = nomCommune; }
    public Prefecture getPrefecture() { return prefecture; }
    public void setPrefecture(Prefecture prefecture) { this.prefecture = prefecture; }
}
