package com.patris.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.patris.service.FileStorageService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@CrossOrigin(origins = { "http://localhost:5173", "http://127.0.0.1:5173" }, maxAge = 3600)
public class FileUploadController {

    private static final List<String> IMAGE_TYPES = List.of("image/jpeg", "image/png", "image/webp");
    private static final List<String> DOCUMENT_TYPES = List.of(
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "application/octet-stream",   // IMPORTANT : type générique que certains OS envoient
        ""                             // IMPORTANT : certains navigateurs n'envoient pas de Content-Type
    );

    private final FileStorageService fileStorageService;

    private boolean isFileAllowed(MultipartFile file, List<String> allowedTypes) {
        String ct = file.getContentType() != null ? file.getContentType().toLowerCase() : "";
        String name = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        
        boolean validMime = allowedTypes.contains(ct);
        
        if (IMAGE_TYPES.equals(allowedTypes)) {
            boolean validExt = name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
            return validMime || validExt;
        } else {
            boolean validExt = name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx")
                            || name.endsWith(".xls") || name.endsWith(".xlsx") || name.endsWith(".ppt")
                            || name.endsWith(".pptx") || name.endsWith(".txt") || name.endsWith(".csv");
            return validMime || validExt;
        }
    }

    @PostMapping("/image")
    public ResponseEntity<Map<String, String>> uploadImage(@RequestParam(value = "file", required = false) MultipartFile file) {
        return upload(file, "photos", IMAGE_TYPES);
    }

    @PostMapping("/document")
    public ResponseEntity<Map<String, String>> uploadDocument(@RequestParam(value = "file", required = false) MultipartFile file) {
        return upload(file, "documents", DOCUMENT_TYPES);
    }

    private ResponseEntity<Map<String, String>> upload(MultipartFile file, String folder, List<String> allowedTypes) {
        Map<String, String> response = new HashMap<>();
        if (file == null || file.isEmpty()) {
            response.put("error", "Fichier absent ou vide.");
            return ResponseEntity.badRequest().body(response);
        }
        
        // Validation selon le type attendu
        if (!isFileAllowed(file, allowedTypes)) {
            response.put("error", "Type de fichier non autorisé.");
            response.put("contentType", file.getContentType());
            response.put("filename", file.getOriginalFilename());
            if (allowedTypes == IMAGE_TYPES) {
                response.put("conseil", "Types acceptés : JPG, JPEG, PNG, WEBP");
            } else {
                response.put("conseil", "Types acceptés : PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX");
            }
            return ResponseEntity.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).body(response);
        }

        try {
            String url = fileStorageService.store(folder, file);
            response.put("url", buildPublicUrl(url));
            response.put("filename", file.getOriginalFilename() == null ? "fichier" : file.getOriginalFilename());
            return ResponseEntity.ok(response);
        } catch (Exception exception) {
            response.put("error", "Erreur backend: " + exception.getClass().getSimpleName());
            response.put("message", exception.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    private String buildPublicUrl(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        if (url.startsWith("http://") || url.startsWith("https://")) {
            return url;
        }
        return "http://localhost:8082" + (url.startsWith("/") ? url : "/" + url);
    }
}
