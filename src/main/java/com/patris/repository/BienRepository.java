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

    @Query("SELECT b FROM Bien b WHERE b.archived = false AND b.id NOT IN (SELECT e.bien.id FROM Entretien e WHERE e.datePrevue >= :limite OR e.dateRealisee >= :limite)")
    List<Bien> findBiensSansEntretienDepuis(@Param("limite") LocalDate limite);

    List<Bien> findByEtatAndArchivedFalse(String etat);
}
