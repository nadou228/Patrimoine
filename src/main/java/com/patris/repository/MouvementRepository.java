package com.patris.repository;

import com.patris.model.Mouvement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;


import java.util.List;

@Repository
public interface MouvementRepository extends JpaRepository<Mouvement, Long> {
    List<Mouvement> findByBienIdOrderByDateCreationDesc(Long bienId);
}
