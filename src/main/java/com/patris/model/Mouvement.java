package com.patris.model;

import java.time.LocalDateTime;

import com.patris.enums.type_mouvement;
import com.patris.enums.statutValidation;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "mouvement")
public class Mouvement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    private type_mouvement type;
    
    private LocalDateTime dateCreation;
    
    @ManyToOne
    @JoinColumn(name = "service_source_id")
    private Services serviceSource;
    
    @ManyToOne
    @JoinColumn(name = "service_destination_id")
    private Services serviceDestination;

    private String observation; 

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    private String validePar;
    private LocalDateTime dateValidation;
    
    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;
    
} 
