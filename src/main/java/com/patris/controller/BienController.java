package com.patris.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.Optional;
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
import com.patris.model.BienImmobilier;
import com.patris.model.BienMaterielRoulant;
import com.patris.model.BienMobilier;
import com.patris.model.Document;
import com.patris.service.BienService;
import com.patris.service.DocumentService;
import com.patris.service.FileStorageService;
import com.patris.service.QrCodeService;
import com.patris.enums.typeDocument;
import com.patris.dto.EtiquetteDto;
import com.patris.service.IupService;
import com.patris.service.RateLimitingService;
import org.springframework.security.core.Authentication;
import org.springframework.beans.factory.annotation.Value;

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
    private final IupService iupService;
    private final RateLimitingService rateLimitingService;
    private final ObjectMapper objectMapper;
    private final com.patris.repository.BienRepository bienRepository;

    @Value("${app.domain:localhost:8082}")
    private String appDomain;

    @GetMapping
    public ResponseEntity<?> findAll(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Boolean archived
    ){
        try {
            if (q != null && !q.isBlank()) {
                return searchBiens(q, null, null);
            }
            log.info("Appel de bienService.findAll()");
            List<Bien> list = Boolean.TRUE.equals(archived) ? bienRepository.findAll() : bienService.findAll();
            log.info("bienService.findAll() réussi. Nb éléments : {}", list.size());
            // test serialization to catch Jackson errors before returning
            log.info("Appel de objectMapper.writeValueAsString()");
            objectMapper.writeValueAsString(list);
            log.info("objectMapper.writeValueAsString() réussi.");
            return ResponseEntity.ok(list);
        } catch (Exception e) {
            log.error("Erreur GET /api/biens", e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage() != null ? e.getMessage() : e.toString());
            return ResponseEntity.status(500).body(error);
        }
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
                || containsIgnoreCase(bien.getLocalisation(), query))
            .filter(bien -> category.isBlank()
                || containsIgnoreCase(bien.getCodeCategorie(), category)
                || containsIgnoreCase(bien.getCodeSousCategorie(), category))
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
        String qrCode = qrCodeService.generateQrCodeBase64(bien.getIup(), appDomain);
        Map<String, String> response = new HashMap<>();
        response.put("qrcode", qrCode);
        response.put("qrCodeBase64", qrCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/qrcode")
    public ResponseEntity<Map<String, String>> getQrCodeByIup(@RequestParam String iup) {
        // Generate QR code directly from IUP, allowing generation before the item is saved
        String qrCode = qrCodeService.generateQrCodeBase64(iup, appDomain);
        Map<String, String> response = new HashMap<>();
        response.put("qrcode", qrCode);
        response.put("qrCodeBase64", qrCode);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/etiquette")
    public ResponseEntity<EtiquetteDto> getEtiquetteData(@PathVariable Long id) {
        Bien bien = bienService.findById(id);
        String qrCode = qrCodeService.generateQrCodeBase64(bien.getIup(), appDomain);
        
        EtiquetteDto dto = EtiquetteDto.builder()
                .iup(bien.getIup())
                .designation(bien.getDesignation())
                .categorie(bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : bien.getCodeCategorie())
                .service(bien.getService())
                .localisation(bien.getLocalisation())
                .dateAcquisition(bien.getDateAcquisition() != null ? bien.getDateAcquisition().toString() : "N/A")
                .valeur(String.format("%.0f FCFA", bien.getValeur()))
                .qrCodeBase64(qrCode)
                .logoMinistere("/logo-ministere.png")
                .build();
        
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/scan/{iup}")
    public ResponseEntity<?> scanBien(@PathVariable String iup, jakarta.servlet.http.HttpServletRequest request) {
        String ip = request.getRemoteAddr();
        if (!rateLimitingService.resolveBucket(ip).tryConsume(1)) {
            return ResponseEntity.status(429).body("Trop de tentatives. Veuillez réessayer plus tard.");
        }
        
        log.info("Scan IUP reçu de {} : {}", ip, iup);
        Bien bien = bienService.findByIup(iup);
        return ResponseEntity.ok(bien);
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
            Bien saved = bienService.saveBien(bien, dto.getSourceStockId(), dto.getSourceStockQuantite(),
                    dto.getSourceBeneficiaireId());
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

            // Si le type est manquant (mise à jour partielle), on le récupère depuis l'existant
            if (!cleanedPayload.containsKey("type") || cleanedPayload.get("type") == null) {
                Bien existing = bienService.findById(id);
                if (existing instanceof BienImmobilier) cleanedPayload.put("type", "IMMOBILIER");
                else if (existing instanceof BienMaterielRoulant) cleanedPayload.put("type", "MATERIEL_ROULANT");
                else cleanedPayload.put("type", "MOBILIER");
            }

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

    @PutMapping("/{id}/statut")
    public ResponseEntity<?> updateStatut(
        @PathVariable Long id,
        @RequestBody Map<String, Object> payload
    ) {
        try {
            org.springframework.security.core.Authentication authentication = 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            String acteur = (authentication != null && authentication.isAuthenticated()) ? authentication.getName() : "systeme";
            String statut = payload.get("statutOperationnel") != null ? String.valueOf(payload.get("statutOperationnel")) : null;
            String service = payload.get("service") != null ? String.valueOf(payload.get("service")) : null;
            Bien updated = bienService.changerStatut(id, statut, service, acteur);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            log.error("Erreur lors du changement de statut pour le bien {}", id, e);
            Map<String, String> error = new HashMap<>();
            error.put("error", "Internal Server Error");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/generate-iup")
    public ResponseEntity<Map<String, Object>> generateIup(@RequestBody Map<String, Object> payload) {
        String nomenclatureCode = Optional.ofNullable(payload.get("nomenclatureCode"))
                .or(() -> Optional.ofNullable(payload.get("categorie")))
                .map(Object::toString).orElse("");
        int annee = Optional.ofNullable(payload.get("annee"))
                .map(o -> Integer.parseInt(o.toString()))
                .orElse(LocalDateTime.now().getYear());
        
        String iup = iupService.generateIup(nomenclatureCode, annee);
        String[] parts = iup.split("-");
        Map<String, Object> response = new HashMap<>();
        response.put("iup", iup);
        response.put("prefixe", parts.length > 0 ? parts[0] : "");
        response.put("annee", parts.length > 1 ? parts[1] : String.valueOf(annee));
        response.put("nomenclature", parts.length > 2 ? parts[2] : nomenclatureCode);
        response.put("sequence", parts.length > 3 ? parts[3] : "");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate-iup")
    public ResponseEntity<Map<String, Boolean>> validateIup(@RequestParam String iup) {
        Map<String, Boolean> response = new HashMap<>();
        response.put("unique", bienService.isIupUnique(iup));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/validate-immatriculation")
    public ResponseEntity<Map<String, Boolean>> validateImmatriculation(
        @RequestParam String immatriculation,
        @RequestParam(required = false) Long excludeId
    ) {
        Map<String, Boolean> response = new HashMap<>();
        response.put("unique", bienService.isImmatriculationUnique(immatriculation, excludeId));
        return ResponseEntity.ok(response);
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
            
            Bien bien = bienRepository.getReferenceById(id);
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
        log.info("Requête DELETE reçue pour le bien id: {}", id);
        bienService.deleteBien(id);
        log.info("Suppression réussie pour le bien id: {}", id);
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

    @GetMapping("/{id}/historique")
    public ResponseEntity<java.util.List<com.patris.dto.HistoriqueBienDto>> getHistorique(@PathVariable Long id) {
        return ResponseEntity.ok(bienService.getHistorique(id));
    }

    private boolean containsIgnoreCase(String source, String expected) {
        return source != null && source.toLowerCase(Locale.ROOT).contains(expected);
    }
} 
