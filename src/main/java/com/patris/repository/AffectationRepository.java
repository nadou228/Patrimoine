package com.patris.repository;

import com.patris.model.Affectation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface AffectationRepository extends JpaRepository<Affectation, Long> {

   @Query("SELECT COUNT(a) FROM Affectation a WHERE a.dateFin IS NULL OR a.dateFin > CURRENT_TIMESTAMP")
   long countActiveAffectations();
    
}
