package com.patris.model;

import java.time.LocalDateTime;

import com.patris.enums.statutValidation;
import com.patris.enums.typeEcartInventaire;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "inventaire_ecart")
public class InventaireEcart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "campagne_id")
    private InventaireCampagne campagne;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    @Enumerated(EnumType.STRING)
    private typeEcartInventaire typeEcart;

    private String justification;
    private String actionCorrective;

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    private String decidePar;
    private LocalDateTime dateDecision;

    // Constructors
    public InventaireEcart() {}

    public InventaireEcart(Long id, InventaireCampagne campagne, Bien bien, typeEcartInventaire typeEcart, String justification, String actionCorrective, statutValidation statutValidation, String decidePar, LocalDateTime dateDecision) {
        this.id = id;
        this.campagne = campagne;
        this.bien = bien;
        this.typeEcart = typeEcart;
        this.justification = justification;
        this.actionCorrective = actionCorrective;
        this.statutValidation = statutValidation;
        this.decidePar = decidePar;
        this.dateDecision = dateDecision;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public InventaireCampagne getCampagne() { return campagne; }
    public void setCampagne(InventaireCampagne campagne) { this.campagne = campagne; }

    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }

    public typeEcartInventaire getTypeEcart() { return typeEcart; }
    public void setTypeEcart(typeEcartInventaire typeEcart) { this.typeEcart = typeEcart; }

    public String getJustification() { return justification; }
    public void setJustification(String justification) { this.justification = justification; }

    public String getActionCorrective() { return actionCorrective; }
    public void setActionCorrective(String actionCorrective) { this.actionCorrective = actionCorrective; }

    public statutValidation getStatutValidation() { return statutValidation; }
    public void setStatutValidation(statutValidation statutValidation) { this.statutValidation = statutValidation; }

    public String getDecidePar() { return decidePar; }
    public void setDecidePar(String decidePar) { this.decidePar = decidePar; }

    public LocalDateTime getDateDecision() { return dateDecision; }
    public void setDateDecision(LocalDateTime dateDecision) { this.dateDecision = dateDecision; }
}
