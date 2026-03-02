package com.patris.repository;

import com.patris.model.Immobilier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ImmobilierRepository extends JpaRepository<Immobilier, Long> {

}
