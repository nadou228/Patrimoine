package com.patris.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.patris.dto.BienDto;
import com.patris.model.Bien;
import com.patris.model.Document;
import com.patris.service.BienService;
import com.patris.service.DocumentService;
import com.patris.service.FileStorageService;
import com.patris.service.QrCodeService;
import com.patris.enums.typeDocument;
import org.springframework.security.core.Authentication;

import lombok.RequiredArgsConstructor;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/biens")
@RequiredArgsConstructor
public class BienController {

    private static final Logger log = LoggerFactory.getLogger(BienController.class);

    private final BienService bienService;
    private final DocumentService documentService;
    private final FileStorageService fileStorageService;
    private final QrCodeService qrCodeService;
    private final ObjectMapper objectMapper;

    @GetMapping
    public List<Bien> findAll(){
        return bienService.findAll();
    }

    @GetMapping("/search")
    public ResponseEntity<List<Bien>> searchBiens(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) String categorie,
        @RequestParam(required = false) String statut
    ) {
        final String query = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        final String category = categorie == null ? "" : categorie.trim().toLowerCase(Locale.ROOT);
        final String state = statut == null ? "" : statut.trim().toLowerCase(Locale.ROOT);

        List<Bien> result = bienService.findAll().stream()
            .filter(bien -> query.isBlank()
                || containsIgnoreCase(bien.getDesignation(), query)
                || containsIgnoreCase(bien.getIup(), query)
                || containsIgnoreCase(bien.getCodeBien(), query)
                || containsIgnoreCase(bien.getCodeSousCategorie(), query)
                || containsIgnoreCase(bien.getLocalisation(), query))
            .filter(bien -> category.isBlank()
                || containsIgnoreCase(bien.getCategoriePrincipale(), category)
                || (bien.getCategorie() != null && containsIgnoreCase(bien.getCategorie().name(), category)))
            .filter(bien -> state.isBlank()
                || containsIgnoreCase(bien.getEtat(), state)
                || (bien.getStatutValidation() != null && containsIgnoreCase(bien.getStatutValidation().name(), state)))
            .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public Bien findById(@PathVariable Long id){
        return bienService.findById(id);
    }

    @GetMapping("/{id}/qrcode")
    public ResponseEntity<Map<String, String>> getQrCode(@PathVariable Long id) {
        Bien bien = bienService.findById(id);
        String qrCode = qrCodeService.generateQrCodeBase64(bien.getIup());
        Map<String, String> response = new HashMap<>();
        response.put("qrcode", qrCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/iup/{iup}")
    public Bien findByIup(@PathVariable String iup){
        return bienService.findByIup(iup);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody String jsonPayload){
        log.debug("Requête POST /api/biens avec JSON brut : {}", jsonPayload);
        try {
            // Lecture flexible du JSON pour éviter les erreurs de type strictes
            Map<String, Object> payload = objectMapper.readValue(jsonPayload, Map.class);
            
            Map<String, Object> cleanedPayload = new HashMap<>(payload);
            cleanedPayload.forEach((key, value) -> {
                if (value instanceof String && ((String) value).trim().isEmpty()) {
                    cleanedPayload.put(key, null);
                }
            });

            BienDto dto = objectMapper.convertValue(cleanedPayload, BienDto.class);
            Bien bien = bienService.fromDto(dto);
            Bien saved = bienService.saveBien(bien);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("ÉCHEC CRITIQUE lors de la création du bien. Cause : {}", e.getMessage());
            Map<String,Object> body = new HashMap<>();
            body.put("error", "Request invalid");
            body.put("message", e.getMessage());
            body.put("details", e.getClass().getSimpleName());
            return ResponseEntity.badRequest().body(body);
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> payload){
        log.debug("Requête PUT /api/biens/{} avec payload : {}", id, payload);
        try {
            Map<String, Object> cleanedPayload = new HashMap<>(payload);
            cleanedPayload.forEach((key, value) -> {
                if (value instanceof String && ((String) value).trim().isEmpty()) {
                    cleanedPayload.put(key, null);
                }
            });

            BienDto dto = objectMapper.convertValue(cleanedPayload, BienDto.class);
            Bien bien = bienService.fromDto(dto);
            Bien updated = bienService.update(id, bien);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Erreur PUT /api/biens/{}", id, e);
            Map<String,Object> body = new HashMap<>();
            body.put("error", "Request invalid");
            body.put("message", e.getMessage());
            body.put("payload", payload);
            return ResponseEntity.badRequest().body(body);
        }
    }

    @PostMapping("/{id}/photo")
    public ResponseEntity<?> uploadPhoto(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file
    ){
        try {
            log.info("Tentative d'upload de photo pour le bien id: {}", id);
            String url = fileStorageService.store("photos", file);
            Bien bien = bienService.findById(id);
            bien.setPhotoUrl(url);
            Bien updated = bienService.update(id, bien);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("ERREUR lors de l'upload de la photo pour le bien {}: {}", id, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/{id}/documents")
    public ResponseEntity<?> uploadDocument(
        @PathVariable Long id,
        @RequestParam("file") MultipartFile file,
        @RequestParam("type") String type
    ){
        try {
            log.info("Tentative d'upload de document pour le bien id: {}, type brut reçu: {}", id, type);
            String url = fileStorageService.store("documents", file);
            
            Document document = new Document();
            document.setNomFichier(file.getOriginalFilename());
            
            // Conversion intelligente du type (MIME ou String) vers l'Enum
            typeDocument tDoc = typeDocument.FACTURES; // Valeur par défaut
            String typeUpper = type.toUpperCase();
            
            if (typeUpper.contains("PDF")) tDoc = typeDocument.TITRE_FONCIERS;
            else if (typeUpper.contains("WORD") || typeUpper.contains("DOC")) tDoc = typeDocument.CONTRATS;
            else if (typeUpper.contains("JSON")) tDoc = typeDocument.CONTRATS; // Ou autre catégorie appropriée
            else {
                try {
                    tDoc = typeDocument.valueOf(typeUpper);
                } catch (Exception e) {
                    log.warn("Type de document '{}' non mappé, utilisation de FACTURES par défaut", type);
                }
            }
            
            document.setTypeDocument(tDoc);
            document.setDateUpload(LocalDateTime.now());
            document.setCheminFichier(url);
            
            Bien bien = new Bien();
            bien.setId(id);
            document.setBien(bien);
            
            Document saved = documentService.save(document);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            log.error("ERREUR lors de l'upload du document pour le bien {}: {}", id, e.getMessage());
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Bien> delete(@PathVariable Long id){
        bienService.deleteBien(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/validate")
    public ResponseEntity<Bien> validateBien(
        @PathVariable Long id,
        @RequestParam("statut") String statut,
        Authentication authentication
    ) {
        Bien updated = bienService.validate(id, com.patris.enums.statutValidation.from(statut), authentication.getName());
        return ResponseEntity.ok(updated);
    }

    private boolean containsIgnoreCase(String source, String expected) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(expected);
    }
} 
