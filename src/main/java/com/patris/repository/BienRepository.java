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

    @Query("SELECT b FROM Bien b WHERE b.id NOT IN (SELECT e.bien.id FROM Entretien e WHERE e.datePrevue >= :limite OR e.dateRealisee >= :limite)")
    List<Bien> findBiensSansEntretienDepuis(@Param("limite") LocalDate limite);

    List<Bien> findByEtat(String string);
}