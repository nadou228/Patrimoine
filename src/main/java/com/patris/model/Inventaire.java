package com.patris.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "inventaires")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Inventaire {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String campagne;
    private String dateDebut;
    private Integer progression;
    private Integer actifsTotal;
    private Integer actifsVerifies;
    private String statut;
}
