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

import com.patris.model.Bien;
import com.patris.service.BienService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/biens")
@RequiredArgsConstructor
public class BienController {

    private final BienService bienService;

    @GetMapping
    public List<Bien> findAll(){
        return bienService.findAll();
    }

    @GetMapping("/{id}")
    public Bien findById(@PathVariable Long id){
        return bienService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Bien> create(@RequestBody Bien bien){
        return ResponseEntity.ok(bienService.saveBien(bien));
    }

    @PutMapping("/{id}")
    public Bien update(@PathVariable Long id, @RequestBody Bien bien){
        return bienService.update(id, bien);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Bien> delete(@PathVariable Long id){
        bienService.deleteBien(id);
        return ResponseEntity.noContent().build();
    }
} 