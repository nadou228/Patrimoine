package com.patris.repository;

import com.patris.model.FicheRecensement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FicheRecensementRepository extends JpaRepository<FicheRecensement, Long> {
}
