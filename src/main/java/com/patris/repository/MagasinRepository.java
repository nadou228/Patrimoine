package com.patris.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.patris.model.Magasin;

public interface MagasinRepository extends JpaRepository<Magasin, Long> {
}
