package com.patris.controller;

import com.patris.dto.CategoriePatrimoineDto;
import com.patris.model.CategoriePatrimoine;
import com.patris.service.CategoriePatrimoineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoriePatrimoineController {

    private final CategoriePatrimoineService service;

    @GetMapping("/tree")
    public ResponseEntity<List<CategoriePatrimoineDto>> getCategoryTree() {
        return ResponseEntity.ok(service.getCategoryTree());
    }

    @GetMapping("/flat")
    public ResponseEntity<List<CategoriePatrimoineDto>> getFlatCategories() {
        return ResponseEntity.ok(service.getFlatCategories());
    }

    @GetMapping("/{code}/formulaire-profil")
    public ResponseEntity<String> getFormProfile(@PathVariable String code) {
        return ResponseEntity.ok(service.getFormProfile(code));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<CategoriePatrimoine> create(@RequestBody CategoriePatrimoine category) {
        return ResponseEntity.ok(service.create(category));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<CategoriePatrimoine> update(@PathVariable Long id, @RequestBody CategoriePatrimoine category) {
        return ResponseEntity.ok(service.update(id, category));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
