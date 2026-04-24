package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.model.Stock;
import com.patris.service.StockService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/stocks")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class StockController {

    private final StockService service;

    @GetMapping
    public List<Stock> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Stock findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Stock> createStock(@RequestBody Stock stock) {
        return ResponseEntity.ok(service.save(stock)) ;
    }

    @PutMapping("/{id}")
    public Stock updateStock(@PathVariable Long id, @RequestBody Stock stock) {
        return service.updateStock(id, stock);
    }

    @PostMapping("/valider/{mouvementId}")
    public ResponseEntity<Void> validerMouvement(@PathVariable Long mouvementId) {
        service.validerMouvement(mouvementId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Stock> deleteStock(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
} 
