package com.patris.model;

import java.time.LocalDateTime;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import com.patris.enums.typeDocument;

@Entity
@Table(name = "document")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nomFichier;

    @Enumerated(EnumType.STRING)
    private typeDocument typeDocument;
    
    private LocalDateTime dateUpload;
    private String cheminFichier;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    @ManyToOne
    @JoinColumn(name = "sinistre_id")
    private Sinistre sinistre;

    public Document() {}

    public Document(Long id, String nomFichier, typeDocument typeDocument, LocalDateTime dateUpload, String cheminFichier, Bien bien, Sinistre sinistre) {
        this.id = id;
        this.nomFichier = nomFichier;
        this.typeDocument = typeDocument;
        this.dateUpload = dateUpload;
        this.cheminFichier = cheminFichier;
        this.bien = bien;
        this.sinistre = sinistre;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNomFichier() { return nomFichier; }
    public void setNomFichier(String nomFichier) { this.nomFichier = nomFichier; }
    public typeDocument getTypeDocument() { return typeDocument; }
    public void setTypeDocument(typeDocument typeDocument) { this.typeDocument = typeDocument; }
    public LocalDateTime getDateUpload() { return dateUpload; }
    public void setDateUpload(LocalDateTime dateUpload) { this.dateUpload = dateUpload; }
    public String getCheminFichier() { return cheminFichier; }
    public void setCheminFichier(String cheminFichier) { this.cheminFichier = cheminFichier; }
    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }
    public Sinistre getSinistre() { return sinistre; }
    public void setSinistre(Sinistre sinistre) { this.sinistre = sinistre; }
}
