package com.patris.repository;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import com.patris.model.MouvementStock;

public interface MouvementStockRepository extends JpaRepository<MouvementStock, Long> {
    List<MouvementStock> findByEstValideFalse();
    List<MouvementStock> findByMagasinId(Long magasinId);
    List<MouvementStock> findByBienCreeIdOrderByDateMouvementDesc(Long bienId);
}
