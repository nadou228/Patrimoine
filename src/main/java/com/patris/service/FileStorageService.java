package com.patris.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path root = Paths.get("uploads");

    public String store(String folder, MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                throw new RuntimeException("Le fichier est vide");
            }

            if (!Files.exists(root)) {
                Files.createDirectories(root);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String originalName = file.getOriginalFilename();
            if (originalName == null || originalName.isBlank()) {
                originalName = "fichier_inconnu.dat";
            }
            String safeName = originalName.replaceAll("[^a-zA-Z0-9._-]", "_");
            String filename = timestamp + "_" + safeName;

            Path targetDir = root.resolve(folder);
            if (!Files.exists(targetDir)) {
                Files.createDirectories(targetDir);
            }
            
            Path target = targetDir.resolve(filename);
            Files.write(target, file.getBytes());

            return "/uploads/" + folder + "/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'enregistrement physique du fichier: " + e.getMessage());
        }
    }
}
