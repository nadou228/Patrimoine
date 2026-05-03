package com.patris.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.patris.model.Sinistre;
import java.util.List;

public interface SinistreRepository extends JpaRepository<Sinistre, Long> {
    List<Sinistre> findByBienId(Long bienId);
}
