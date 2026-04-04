package com.patris.repository;

import com.patris.model.Inventaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface InventaireRepository extends JpaRepository<Inventaire, Long> {
}
