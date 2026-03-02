package com.patris.repository;

import com.patris.model.Consommable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsommableRepository extends JpaRepository<Consommable, Long> {
}
