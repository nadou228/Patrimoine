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

import com.patris.model.Sinistre;
import com.patris.service.SinistreService;

import lombok.RequiredArgsConstructor;


@RestController
@RequestMapping("/api/sinistre")
@RequiredArgsConstructor
public class SinistreController {

    private final SinistreService sinistreService;

    @GetMapping
    public List<Sinistre> findAll(){
        return sinistreService.findAll();
    }

    @GetMapping("/{id}")
    public Sinistre findById(@PathVariable Long id){
        return sinistreService.findById(id);
    }

    @PostMapping
    public ResponseEntity<Sinistre> create(@RequestBody Sinistre sinistre){
        return ResponseEntity.ok(sinistreService.save(sinistre));
    }

    @PutMapping("/{id}")
    public Sinistre update(@PathVariable Long id, @RequestBody Sinistre sinistre){
        return sinistreService.update(id, sinistre);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Sinistre> delete(@PathVariable Long id){
        sinistreService.delete(id);
        return ResponseEntity.noContent().build();
    }

}
