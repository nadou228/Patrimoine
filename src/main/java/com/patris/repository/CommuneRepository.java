package com.patris.repository;

import com.patris.model.Commune;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


@Repository
public interface CommuneRepository extends JpaRepository<Commune, Long> {
    
} 
