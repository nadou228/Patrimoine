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

import com.patris.model.MouvementStock;
import com.patris.service.MouvementStockService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/mouvement_stock")
@RequiredArgsConstructor
public class MouvementStockController {

    private final MouvementStockService service;

    @GetMapping
    public List<MouvementStock> findAll(){
        return service.findAll();
    }
    
    @GetMapping("/{id}")
    public MouvementStock  findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<MouvementStock> create(@RequestBody MouvementStock mouvementStock){
        return ResponseEntity.ok(service.save(mouvementStock));
    }

    @PutMapping("/{id}")
    public MouvementStock update(@PathVariable Long id, @RequestBody MouvementStock mouvementStock){
        return service.update(id, mouvementStock);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MouvementStock> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
    

    

}
