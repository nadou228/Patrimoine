package com.patris.model;

import java.time.LocalDateTime;

import com.patris.enums.type_mouvement;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "mouvement_stock")
public class MouvementStock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    private type_mouvement typeMouvement;
    private int quantite;
    private LocalDateTime dateMouvement;
    private String destination;
    private Double prixUnitaire;
    private String referencePiece;

    @ManyToOne
    @JoinColumn(name = "stock_id")
    private Stock stock;

}
