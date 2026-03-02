package com.patris.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.patris.model.Region;
import com.patris.repository.RegionRepository;

@Service
public class RegionService {

    private final RegionRepository repository;

    public RegionService(RegionRepository repository){
        this.repository = repository;
    }

    public List<Region> findAll(){
        return repository.findAll();
    }

    public Region findById(Long id){
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Region introuvable"));
    }

    public Region save(Region region){
        return repository.save(region);
    }

    public Region update(Long id, Region r){
        Region region = findById(id);
        region.setNomRegion(r.getNomRegion());
        
        return repository.save(region);
    }

    public void deleteById(Long id){
        repository.deleteById(id);
    }

}
