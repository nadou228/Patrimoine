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

import com.patris.model.Bail;
import com.patris.service.BailService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/bail")
@RequiredArgsConstructor
public class BailController {

    private final BailService service;

    @GetMapping
    public List<Bail> findAll(){
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Bail findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Bail> create(@RequestBody Bail bail){
        return ResponseEntity.ok(service.save(bail));
    }

    @PutMapping("/{id}")
    public Bail update(@PathVariable Long id, @RequestBody Bail bail){
        return service.update(id, bail);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Bail> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

}
