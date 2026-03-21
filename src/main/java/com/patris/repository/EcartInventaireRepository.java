package com.patris.repository;

import com.patris.model.EcartInventaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface EcartInventaireRepository extends JpaRepository<EcartInventaire, Long> {
}
