package com.patris.repository;

import com.patris.model.Affectation;
import com.patris.enums.statutValidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface AffectationRepository extends JpaRepository<Affectation, Long> {

   @Query("SELECT COUNT(a) FROM Affectation a WHERE a.dateFin IS NULL OR a.dateFin > CURRENT_TIMESTAMP")
   long countActiveAffectations();

   // Utilisation d'une mÃ©thode dÃ©rivÃ©e standard avec @Param pour robustesse
   Optional<Affectation> findTopByBienIdAndStatutValidationOrderByDateValidationDesc(
       @Param("bienId") Long bienId, 
       @Param("statut") statutValidation statut
   );
}
