package com.patris.service;

import com.patris.model.NomenclatureCompte;
import com.patris.repository.NomenclatureCompteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class NomenclatureService {

    @Autowired
    private NomenclatureCompteRepository repository;

    public List<Map<String, Object>> getComptes(String partie, String typeBien) {
        List<Object[]> results = repository.findDistinctComptes(partie, typeBien);
        return results.stream().map(row -> {
            Map<String, Object> map = new HashMap<>();
            map.put("compte_principal", row[0]);
            map.put("libelle_compte", row[1]);
            map.put("partie", row[2]);
            map.put("type_bien", row[3]);
            map.put("nb_items", repository.countByComptePrincipalAndActifTrue((String) row[0]));
            return map;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getCategories(String compte, String partie) {
        List<String> categories = repository.findDistinctCategories(compte, partie);
        return categories.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("categorie", c);
            map.put("compte_principal", compte);
            return map;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getFamilles(String categorie, String compte) {
        List<String> familles = repository.findDistinctFamilles(categorie, compte);
        return familles.stream().map(f -> {
            Map<String, Object> map = new HashMap<>();
            map.put("famille", f);
            map.put("categorie", categorie);
            return map;
        }).collect(Collectors.toList());
    }

    public List<NomenclatureCompte> getArticles(String famille, String compte, String categorie, String partie, String typeBien) {
        // We can't easily use the method name for all nullable params without multiple versions, 
        // so we'll use a dynamic query or just filter if small enough, but let's stick to repository query if possible.
        // For simplicity, I'll use a custom JPQL if needed, but for now let's assume all are provided or handle it.
        return repository.findAll().stream()
                .filter(n -> n.isActif())
                .filter(n -> famille == null || famille.equals(n.getFamille()))
                .filter(n -> compte == null || compte.equals(n.getComptePrincipal()))
                .filter(n -> categorie == null || categorie.equals(n.getCategorie()))
                .filter(n -> partie == null || partie.equals(n.getPartie()))
                .filter(n -> type_bien_filter(n, typeBien))
                .sorted((a, b) -> (a.getComptePrincipal() + a.getCode()).compareTo(b.getComptePrincipal() + b.getCode()))
                .collect(Collectors.toList());
    }

    private boolean type_bien_filter(NomenclatureCompte n, String typeBien) {
        return typeBien == null || typeBien.equals(n.getTypeBien());
    }

    public List<NomenclatureCompte> search(String q, String partie, String typeBien) {
        return repository.search(q, partie, typeBien);
    }

    public NomenclatureCompte getByCode(String code) {
        return repository.findById(code).orElse(null);
    }

    public void importData(List<NomenclatureCompte> data) {
        repository.saveAll(data);
    }

    public NomenclatureCompte save(NomenclatureCompte item) {
        return repository.save(item);
    }

    public void delete(String code) {
        NomenclatureCompte item = repository.findById(code).orElse(null);
        if (item != null) {
            item.setActif(false);
            repository.save(item);
        }
    }
}
