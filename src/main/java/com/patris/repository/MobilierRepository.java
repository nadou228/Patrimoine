package com.patris.repository;

import com.patris.model.Mobilier;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MobilierRepository extends JpaRepository<Mobilier, Long> {
}
