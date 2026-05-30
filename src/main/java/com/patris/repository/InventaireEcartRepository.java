package com.patris.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.InventaireEcart;

public interface InventaireEcartRepository extends JpaRepository<InventaireEcart, Long> {
    List<InventaireEcart> findByCampagneId(Long campagneId);

    java.util.Optional<InventaireEcart> findByCampagneIdAndBienIdAndTypeEcart(
            Long campagneId, Long bienId, com.patris.enums.typeEcartInventaire typeEcart);
    
    long countByCampagneIdAndStatutValidation(Long cid, com.patris.enums.statutValidation statut);

    long countByCampagneId(Long campagneId);
}
