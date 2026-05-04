package com.patris.controller;

import com.patris.model.NomenclatureCompte;
import com.patris.service.NomenclatureService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/nomenclature")
@CrossOrigin(origins = "*")
public class NomenclatureController {

    @Autowired
    private NomenclatureService service;

    @GetMapping("/comptes")
    public ResponseEntity<?> getComptes(
            @RequestParam(required = false) String partie,
            @RequestParam(required = false) String type_bien) {
        List<Map<String, Object>> data = service.getComptes(partie, type_bien);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("meta", Map.of("total", data.size()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/categories")
    public ResponseEntity<?> getCategories(
            @RequestParam(required = false) String compte,
            @RequestParam(required = false) String partie) {
        List<Map<String, Object>> data = service.getCategories(compte, partie);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("meta", Map.of("total", data.size()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/familles")
    public ResponseEntity<?> getFamilles(
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String compte) {
        List<Map<String, Object>> data = service.getFamilles(categorie, compte);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("meta", Map.of("total", data.size()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/articles")
    public ResponseEntity<?> getArticles(
            @RequestParam(required = false) String famille,
            @RequestParam(required = false) String compte,
            @RequestParam(required = false) String categorie,
            @RequestParam(required = false) String partie,
            @RequestParam(required = false) String type_bien) {
        List<NomenclatureCompte> data = service.getArticles(famille, compte, categorie, partie, type_bien);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("meta", Map.of("total", data.size()));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(
            @RequestParam String q,
            @RequestParam(required = false) String partie,
            @RequestParam(required = false) String type_bien,
            @RequestParam(defaultValue = "20") int limit) {
        if (q == null || q.trim().length() < 2) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", Map.of("code", "QUERY_TOO_SHORT", "message", "Le terme de recherche doit contenir au moins 2 caractères")
            ));
        }
        List<NomenclatureCompte> data = service.search(q, partie, type_bien);
        // Apply limit if needed (search query already has take in Express, but here we can sublist)
        if (data.size() > limit) {
            data = data.subList(0, limit);
        }
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        response.put("meta", Map.of("total", data.size(), "terme", q));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{code}")
    public ResponseEntity<?> getByCode(@PathVariable String code) {
        NomenclatureCompte data = service.getByCode(code);
        if (data == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", Map.of("code", "NOT_FOUND", "message", "Code nomenclature '" + code + "' introuvable")
            ));
        }
        return ResponseEntity.ok(Map.of("success", true, "data", data));
    }

    @PostMapping("/import")
    public ResponseEntity<?> importData(@RequestBody Map<String, List<NomenclatureCompte>> payload) {
        List<NomenclatureCompte> data = payload.get("data");
        if (data == null || data.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "No data provided"));
        }
        service.importData(data);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("traites", data.size(), "message", "Import nomenclature terminé avec succès")));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody NomenclatureCompte item) {
        if (service.getByCode(item.getCode()) != null) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "success", false,
                    "error", Map.of("code", "CODE_ALREADY_EXISTS", "message", "Le code " + item.getCode() + " existe déjà")
            ));
        }
        NomenclatureCompte created = service.save(item);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("success", true, "data", created));
    }

    @PutMapping("/{code}")
    public ResponseEntity<?> update(@PathVariable String code, @RequestBody NomenclatureCompte item) {
        NomenclatureCompte existing = service.getByCode(code);
        if (existing == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "error", Map.of("code", "NOT_FOUND", "message", "Code nomenclature introuvable")
            ));
        }
        item.setCode(code); // Ensure code is correct
        NomenclatureCompte updated = service.save(item);
        return ResponseEntity.ok(Map.of("success", true, "data", updated));
    }

    @DeleteMapping("/{code}")
    public ResponseEntity<?> delete(@PathVariable String code) {
        // Logic for checking dependencies should be here
        // For now, simple soft delete
        service.delete(code);
        return ResponseEntity.ok(Map.of("success", true, "data", Map.of("message", "Code " + code + " archivé avec succès")));
    }
}
