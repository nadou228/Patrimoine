package com.patris.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.InventaireFiche;

public interface InventaireFicheRepository extends JpaRepository<InventaireFiche, Long> {
    List<InventaireFiche> findByCampagneId(Long campagneId);

    java.util.Optional<InventaireFiche> findByCampagneIdAndBienId(Long campagneId, Long bienId);

    java.util.Optional<InventaireFiche> findByCampagneIdAndCodeIupIgnoreCase(Long campagneId, String codeIup);

    long countByCampagneId(Long campagneId);

    long countByCampagneIdAndEtatConstateNot(Long campagneId, String etatConstate);

    long countByCampagneIdAndValidationAgent(Long campagneId, com.patris.enums.statutValidation statut);

    long countByCampagneIdAndValidationSuperviseur(Long campagneId, com.patris.enums.statutValidation statut);

    long countByCampagneIdAndAnomalieTrue(Long campagneId);
    
    long countByCampagneIdAndValidationSuperviseurAndAnomalieTrue(Long id, com.patris.enums.statutValidation statut);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE InventaireFiche f SET f.validationSuperviseur = :statut, f.superviseurUsername = :user WHERE f.campagne.id = :cid AND (f.anomalie = false OR f.anomalie IS NULL)")
    void validerZoneConfort(@org.springframework.data.repository.query.Param("cid") Long cid, @org.springframework.data.repository.query.Param("statut") com.patris.enums.statutValidation statut, @org.springframework.data.repository.query.Param("user") String user);
}
