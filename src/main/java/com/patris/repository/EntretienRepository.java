package com.patris.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.patris.model.Entretien;

@Repository
public interface EntretienRepository extends JpaRepository<Entretien, Long> {

} 