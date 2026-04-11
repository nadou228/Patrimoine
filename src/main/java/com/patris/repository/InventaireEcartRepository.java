package com.patris.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.InventaireEcart;

public interface InventaireEcartRepository extends JpaRepository<InventaireEcart, Long> {
    List<InventaireEcart> findByCampagneId(Long campagneId);
    
    long countByCampagneIdAndStatutValidation(Long cid, com.patris.enums.statutValidation statut);
}
