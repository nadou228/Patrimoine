package com.patris.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.patris.dto.AffectationDto;
import com.patris.model.Affectation;
import com.patris.service.AffectationService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/affectations")
@RequiredArgsConstructor
@Slf4j
public class AffectationController {

    private final AffectationService service;
    private final ObjectMapper objectMapper;

    @GetMapping
    public List<Affectation> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Affectation findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Map<String, Object> payload) {
        log.debug("Requête POST /api/affectations avec payload : {}", payload);
        try {
            AffectationDto dto = objectMapper.convertValue(payload, AffectationDto.class);
            Affectation saved = service.saveFromDto(dto);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("Erreur création affectation", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> payload){
        try {
            AffectationDto dto = objectMapper.convertValue(payload, AffectationDto.class);
            Affectation updated = service.updateFromDto(id, dto);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Erreur update affectation", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
