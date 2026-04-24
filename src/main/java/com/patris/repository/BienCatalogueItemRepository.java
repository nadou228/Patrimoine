package com.patris.repository;

import com.patris.model.BienCatalogueItem;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BienCatalogueItemRepository extends JpaRepository<BienCatalogueItem, Long> {
    List<BienCatalogueItem> findAllByActifTrueOrderByOrdreAffichageAscCodeAsc();
    Optional<BienCatalogueItem> findByCode(String code);
}
