package com.patris.repository;

import com.patris.model.UtilisateurPermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UtilisateurPermissionRepository extends JpaRepository<UtilisateurPermission, Long> {

    List<UtilisateurPermission> findByUtilisateur_IdOrderByDateAccordDesc(Long utilisateurId);

    Optional<UtilisateurPermission> findByUtilisateur_IdAndPermissionCode(Long utilisateurId, String permissionCode);

    void deleteByUtilisateur_IdAndPermissionCode(Long utilisateurId, String permissionCode);
}
