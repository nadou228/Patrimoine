package com.patris.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.patris.model.Prefecture;
import com.patris.model.Region;
import com.patris.repository.PrefectureRepository;
import com.patris.repository.RegionRepository;

@Service
public class PrefectureService {

    private final PrefectureRepository prefectureRepository;
    private final RegionRepository regionRepository;

    public PrefectureService(PrefectureRepository prefectureRepository,
                              RegionRepository regionRepository) {
        this.prefectureRepository = prefectureRepository;
        this.regionRepository = regionRepository;
    }

    public List<Prefecture> findAll() {
        return prefectureRepository.findAll();
    }

    public Prefecture findById(Long id) {
        return prefectureRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("PrÃ©fecture introuvable"));
    }

    public Prefecture save(Prefecture prefecture) {
        Long regionId = prefecture.getRegion().getId();
        Region region = regionRepository.findById(regionId)
                .orElseThrow(() -> new RuntimeException("RÃ©gion introuvable"));
        prefecture.setRegion(region);
        return prefectureRepository.save(prefecture);
    }

    public Prefecture update(Long id, Prefecture p) {
        Prefecture prefecture = findById(id);
        prefecture.setNomPrefecture(p.getNomPrefecture());

        // Mise Ã  jour de la rÃ©gion si elle est fournie
        if (p.getRegion() != null && p.getRegion().getId() != null) {
            Region region = regionRepository.findById(p.getRegion().getId())
                    .orElseThrow(() -> new RuntimeException("RÃ©gion introuvable"));
            prefecture.setRegion(region);
        }

        return prefectureRepository.save(prefecture);
    }

    public void deleteById(Long id) {
        prefectureRepository.deleteById(id);
    }
}
