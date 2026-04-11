package com.patris.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.patris.service.FileStorageService;
import lombok.RequiredArgsConstructor;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@CrossOrigin(origins = "*", maxAge = 3600)
public class FileUploadController {

    private final FileStorageService fileStorageService;

    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam(value = "file", required = false) MultipartFile file) {
        Map<String, String> response = new HashMap<>();

        if (file == null) {
            System.err.println("ERREUR: Le paramètre 'file' est manquant dans la requête.");
            response.put("error", "Le paramètre 'file' est manquant.");
            return ResponseEntity.badRequest().body(response);
        }

        if (file.isEmpty()) {
            System.err.println("ERREUR: Le fichier reçu est vide.");
            response.put("error", "Le fichier est vide.");
            return ResponseEntity.badRequest().body(response);
        }

        System.out.println("DEBUT UPLOAD: Nom=" + file.getOriginalFilename() + ", Taille=" + file.getSize() + ", Type=" + file.getContentType());

        try {
            // Utilisation du service centralisé
            String url = fileStorageService.store("photos", file);
            System.out.println("SUCCÈS UPLOAD: URL=" + url);
            response.put("url", url);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("ERREUR CRITIQUE lors de l'appel à FileStorageService: " + e.getMessage());
            e.printStackTrace();
            // Retourne EXPLICITEMENT le message d'erreur natif au lieu d'un 500 obscur
            response.put("error", "Erreur backend: " + e.getClass().getSimpleName() + " - " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }}
