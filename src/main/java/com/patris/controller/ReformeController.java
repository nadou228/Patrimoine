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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;

import com.patris.model.Reforme;
import com.patris.service.ReformeService;
import com.patris.service.FileStorageService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/reformes")
@RequiredArgsConstructor
public class ReformeController {

    private final ReformeService service;
    private final FileStorageService fileStorageService;

    @GetMapping
    public List<Reforme> findAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public Reforme findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<Reforme> create(@RequestBody Reforme reforme) {
        return ResponseEntity.ok(service.create(reforme));
    }

    @PutMapping("/{id}")
    public Reforme update(@PathVariable Long id, @RequestBody Reforme reforme) {
        return service.update(id, reforme);
    }

    @PostMapping("/{id}/rapport")
    public Reforme uploadRapport(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        String url = fileStorageService.store("rapports", file);
        Reforme reforme = service.findById(id);
        reforme.setRapportTechniqueUrl(url);
        return service.update(id, reforme);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
