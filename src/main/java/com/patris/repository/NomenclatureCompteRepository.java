package com.patris.repository;

import com.patris.model.NomenclatureCompte;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NomenclatureCompteRepository extends JpaRepository<NomenclatureCompte, String> {

    @Query("SELECT DISTINCT n.comptePrincipal as comptePrincipal, n.libelleCompte as libelleCompte, n.partie as partie, n.typeBien as typeBien " +
           "FROM NomenclatureCompte n WHERE n.actif = true " +
           "AND (:partie IS NULL OR n.partie = :partie) " +
           "AND (:typeBien IS NULL OR n.typeBien = :typeBien) " +
           "ORDER BY n.comptePrincipal ASC")
    List<Object[]> findDistinctComptes(@Param("partie") String partie, @Param("typeBien") String typeBien);

    @Query("SELECT DISTINCT n.categorie FROM NomenclatureCompte n WHERE n.actif = true " +
           "AND (:compte IS NULL OR n.comptePrincipal = :compte) " +
           "AND (:partie IS NULL OR n.partie = :partie) " +
           "ORDER BY n.categorie ASC")
    List<String> findDistinctCategories(@Param("compte") String compte, @Param("partie") String partie);

    @Query("SELECT DISTINCT n.famille FROM NomenclatureCompte n WHERE n.actif = true " +
           "AND (:categorie IS NULL OR n.categorie = :categorie) " +
           "AND (:compte IS NULL OR n.comptePrincipal = :compte) " +
           "ORDER BY n.famille ASC")
    List<String> findDistinctFamilles(@Param("categorie") String categorie, @Param("compte") String compte);

    List<NomenclatureCompte> findByFamilleAndComptePrincipalAndCategorieAndPartieAndTypeBienAndActifTrueOrderByComptePrincipalAscCodeAsc(
            String famille, String comptePrincipal, String categorie, String partie, String typeBien);

    @Query("SELECT n FROM NomenclatureCompte n WHERE n.actif = true " +
           "AND (:q IS NULL OR (LOWER(n.code) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(n.intitule) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(n.libelleCompte) LIKE LOWER(CONCAT('%', :q, '%')))) " +
           "AND (:partie IS NULL OR n.partie = :partie) " +
           "AND (:typeBien IS NULL OR n.typeBien = :typeBien) " +
           "ORDER BY n.code ASC")
    List<NomenclatureCompte> search(@Param("q") String q, @Param("partie") String partie, @Param("typeBien") String typeBien);

    long countByComptePrincipalAndActifTrue(String comptePrincipal);
}
