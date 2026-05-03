package com.patris.repository;

import com.patris.model.CategoriePatrimoine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CategoriePatrimoineRepository extends JpaRepository<CategoriePatrimoine, Long> {
    Optional<CategoriePatrimoine> findByCode(String code);
    List<CategoriePatrimoine> findByActifTrueOrderByOrdreAsc();
    List<CategoriePatrimoine> findByCodeParentAndActifTrueOrderByOrdreAsc(String codeParent);
    boolean existsByCode(String code);
    long countByCodeStartingWith(String prefix);
}
