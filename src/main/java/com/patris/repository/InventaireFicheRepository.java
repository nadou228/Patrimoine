package com.patris.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.InventaireFiche;

public interface InventaireFicheRepository extends JpaRepository<InventaireFiche, Long> {
    List<InventaireFiche> findByCampagneId(Long campagneId);
}
