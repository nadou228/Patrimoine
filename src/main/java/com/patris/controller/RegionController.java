package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.model.Region;
import com.patris.service.RegionService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/region")
@RequiredArgsConstructor
public class RegionController {

    private final RegionService service;

    @GetMapping
    public List<Region> findAll(){
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Region findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Region> create(@RequestBody Region region){
        return ResponseEntity.ok(service.save(region));
    }

    @PutMapping("/{id}")
    public Region update(@PathVariable Long id, @RequestBody Region region){
        return service.update(id, region);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Region> delete(@PathVariable Long id){
        service.deleteById(id);
        return ResponseEntity.noContent().build();
    }

}
