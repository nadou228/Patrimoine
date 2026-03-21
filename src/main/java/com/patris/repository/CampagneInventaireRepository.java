package com.patris.repository;

import com.patris.model.CampagneInventaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CampagneInventaireRepository extends JpaRepository<CampagneInventaire, Long> {
}
