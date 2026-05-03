package com.patris.service;

import com.patris.dto.CategoriePatrimoineDto;
import com.patris.model.CategoriePatrimoine;
import com.patris.repository.CategoriePatrimoineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoriePatrimoineService {

    private final CategoriePatrimoineRepository repository;

    public String getFormProfile(String code) {
        CategoriePatrimoine cat = repository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Catégorie introuvable"));
        
        if (cat.getProfilFormulaire() != null) {
            return cat.getProfilFormulaire();
        }
        
        // Si pas de profil, chercher chez le parent
        if (cat.getCodeParent() != null) {
            return getFormProfile(cat.getCodeParent());
        }
        
        return "{}"; // Profil vide par défaut
    }

    public List<CategoriePatrimoineDto> getFlatCategories() {
        return repository.findByActifTrueOrderByOrdreAsc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<CategoriePatrimoineDto> getCategoryTree() {
        List<CategoriePatrimoine> allActive = repository.findByActifTrueOrderByOrdreAsc();
        
        // Map all to DTO
        Map<String, CategoriePatrimoineDto> dtoMap = allActive.stream()
                .collect(Collectors.toMap(CategoriePatrimoine::getCode, this::mapToDto));

        List<CategoriePatrimoineDto> roots = new ArrayList<>();

        for (CategoriePatrimoine cat : allActive) {
            CategoriePatrimoineDto dto = dtoMap.get(cat.getCode());
            if (cat.getCodeParent() == null) {
                roots.add(dto);
            } else {
                CategoriePatrimoineDto parent = dtoMap.get(cat.getCodeParent());
                if (parent != null) {
                    parent.getEnfants().add(dto);
                }
            }
        }

        return roots;
    }

    @org.springframework.transaction.annotation.Transactional
    public CategoriePatrimoine create(CategoriePatrimoine entity) {
        if (entity.getCode() == null || entity.getCode().isBlank()) {
            entity.setCode(generateCode(entity));
        }
        if (repository.existsByCode(entity.getCode())) {
            throw new RuntimeException("Une catégorie avec ce code existe déjà : " + entity.getCode());
        }
        return repository.save(entity);
    }

    @org.springframework.transaction.annotation.Transactional
    public CategoriePatrimoine update(Long id, CategoriePatrimoine data) {
        CategoriePatrimoine existing = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Catégorie introuvable"));
        
        existing.setLibelle(data.getLibelle());
        existing.setIcone(data.getIcone());
        existing.setCouleur(data.getCouleur());
        existing.setOrdre(data.getOrdre());
        existing.setActif(data.isActif());
        // Le code et le niveau ne devraient pas changer une fois créés pour garder la cohérence de l'IUP
        
        return repository.save(existing);
    }

    @org.springframework.transaction.annotation.Transactional
    public void delete(Long id) {
        repository.deleteById(id);
    }

    public String generateCode(CategoriePatrimoine entity) {
        if (entity.getNiveau() == com.patris.enums.NiveauCategorie.CATEGORIE) {
            return entity.getLibelle().substring(0, Math.min(3, entity.getLibelle().length())).toUpperCase();
        }

        String parentCode = entity.getCodeParent();
        if (parentCode == null) {
            throw new RuntimeException("Une famille ou sous-catégorie doit avoir un code parent.");
        }

        String prefix = parentCode.contains("-") ? parentCode.split("-")[0] : parentCode;
        String namePart = entity.getLibelle().replaceAll("[^a-zA-Z]", "");
        String middle = namePart.substring(0, Math.min(2, namePart.length())).toUpperCase();
        
        long count = repository.countByCodeStartingWith(prefix + "-" + middle);
        String finalCode = String.format("%s-%s-%03d", prefix, middle, count + 1);
        
        // Vérification récursive d'unicité (au cas où la séquence existerait déjà)
        while (repository.existsByCode(finalCode)) {
            count++;
            finalCode = String.format("%s-%s-%03d", prefix, middle, count + 1);
        }
        
        return finalCode;
    }

    private String getRootCode(CategoriePatrimoine cat) {
        if (cat.getCodeParent() == null) {
            return cat.getCode();
        }
        CategoriePatrimoine parent = repository.findByCode(cat.getCodeParent()).orElse(null);
        if (parent == null) return cat.getCode();
        return getRootCode(parent);
    }

    private CategoriePatrimoineDto mapToDto(CategoriePatrimoine entity) {
        CategoriePatrimoineDto dto = new CategoriePatrimoineDto();
        dto.setId(entity.getId());
        dto.setCode(entity.getCode());
        dto.setLibelle(entity.getLibelle());
        dto.setNiveau(entity.getNiveau());
        dto.setCodeParent(entity.getCodeParent());
        dto.setIcone(entity.getIcone());
        dto.setCouleur(entity.getCouleur());
        dto.setOrdre(entity.getOrdre());
        dto.setActif(entity.isActif());
        return dto;
    }
}
