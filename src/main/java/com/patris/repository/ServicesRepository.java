package com.patris.repository;

import java.util.Optional;
import com.patris.model.Services;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ServicesRepository extends JpaRepository<Services, Long> {
    Optional<Services> findByNomService(String nomService);
}
