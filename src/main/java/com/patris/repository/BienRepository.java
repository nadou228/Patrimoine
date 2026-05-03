package com.patris.repository;

import com.patris.model.Bien;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BienRepository extends JpaRepository<Bien, Long> {

    List<Bien> findAllByArchivedFalse();

    java.util.Optional<Bien> findByIdAndArchivedFalse(Long id);

    boolean existsByIup(String iup);

    java.util.Optional<Bien> findByIupAndArchivedFalse(String iup);
    
    java.util.Optional<Bien> findByDesignation(String designation);

    @Query("SELECT MAX(b.iup) FROM Bien b WHERE b.iup LIKE :prefix%")
    String findMaxIupByPrefix(@Param("prefix") String prefix);

    @Query(value = "SELECT nextval('iup_sequence')", nativeQuery = true)
    Long getNextIupSequenceValue();

    @Query("SELECT b FROM Bien b WHERE b.archived = false AND b.id NOT IN (SELECT e.bien.id FROM Entretien e WHERE e.datePrevue >= :limite OR e.dateRealisee >= :limite)")
    List<Bien> findBiensSansEntretienDepuis(@Param("limite") LocalDate limite);

    List<Bien> findByEtatAndArchivedFalse(String etat);

    List<Bien> findByLocalisationContainingAndArchivedFalse(String localisation);

    List<Bien> findByCodeCategorieAndArchivedFalse(String codeCategorie);

    List<Bien> findByCodeSousCategorieAndArchivedFalse(String codeSousCategorie);

    @Query("""
        SELECT CASE WHEN COUNT(b) > 0 THEN true ELSE false END
        FROM BienMaterielRoulant b
        WHERE b.archived = false
          AND UPPER(b.immatriculation) = UPPER(:immatriculation)
          AND (:excludeId IS NULL OR b.id <> :excludeId)
    """)
    boolean existsActiveImmatriculation(@Param("immatriculation") String immatriculation, @Param("excludeId") Long excludeId);
}
