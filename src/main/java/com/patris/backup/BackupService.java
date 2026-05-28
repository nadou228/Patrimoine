package com.patris.backup;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@Slf4j
public class BackupService {

    @Value("${spring.datasource.username:postgres}")
    private String dbUsername;

    @Value("${spring.datasource.password:}")
    private String dbPassword;

    // e.g. jdbc:postgresql://localhost:5432/patrimoine
    @Value("${spring.datasource.url:jdbc:postgresql://localhost:5432/patrimoine}")
    private String dbUrl;

    // Use a default path relative to user home if not configured
    @Value("${app.backup.path:${user.home}/patrimoine_backups}")
    private String backupDirectoryPath;

    @Value("${app.backup.pgdump.path:pg_dump}")
    private String pgDumpPath;

    public String createBackup(String type) {
        log.info("Démarrage de la sauvegarde ({})", type);
        try {
            String dbName = extractDbName(dbUrl);
            String dbHost = extractDbHost(dbUrl);
            String dbPort = extractDbPort(dbUrl);

            Path dirPath = Paths.get(backupDirectoryPath, type);
            if (!Files.exists(dirPath)) {
                Files.createDirectories(dirPath);
            }

            String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
            String fileName = "backup_" + dbName + "_" + type + "_" + timestamp + ".sql.gz";
            String fullPath = dirPath.resolve(fileName).toString();

            // On Windows, you can use ProcessBuilder with pg_dump. 
            // pg_dump -h localhost -p 5432 -U postgres -d patrimoine -Z 9 -f backup.sql.gz
            List<String> command = new ArrayList<>();
            command.add(pgDumpPath);
            command.add("-h"); command.add(dbHost);
            command.add("-p"); command.add(dbPort);
            command.add("-U"); command.add(dbUsername);
            command.add("-Z"); command.add("9"); // Compression maximale (gz)
            command.add("-f"); command.add(fullPath);
            command.add("-d"); command.add(dbName);

            ProcessBuilder pb = new ProcessBuilder(command);
            pb.environment().put("PGPASSWORD", dbPassword);
            
            Process process = pb.start();
            int exitCode = process.waitFor();

            if (exitCode == 0) {
                log.info("Sauvegarde réussie : {}", fullPath);
                return fileName;
            } else {
                log.error("Échec de la sauvegarde (Code: {}). Assurez-vous que pg_dump est installé et accessible dans le PATH.", exitCode);
                throw new RuntimeException("Échec de la commande pg_dump. Code retour: " + exitCode);
            }

        } catch (Exception e) {
            log.error("Erreur lors de la sauvegarde : ", e);
            throw new RuntimeException("Erreur lors de la sauvegarde", e);
        }
    }

    public List<BackupFileInfo> listBackups() {
        List<BackupFileInfo> allBackups = new ArrayList<>();
        try {
            Path rootPath = Paths.get(backupDirectoryPath);
            if (!Files.exists(rootPath)) return allBackups;

            try (Stream<Path> stream = Files.walk(rootPath, 2)) {
                allBackups = stream.filter(file -> !Files.isDirectory(file) && file.toString().endsWith(".sql.gz"))
                        .map(file -> {
                            File f = file.toFile();
                            String type = file.getParent().getFileName().toString();
                            return new BackupFileInfo(f.getName(), type, f.length(), f.lastModified());
                        })
                        .sorted((a, b) -> Long.compare(b.timestamp(), a.timestamp()))
                        .collect(Collectors.toList());
            }
        } catch (IOException e) {
            log.error("Erreur listage backups", e);
        }
        return allBackups;
    }

    private String extractDbName(String url) {
        try { return url.substring(url.lastIndexOf("/") + 1).split("\\?")[0]; } catch (Exception e) { return "patrimoine"; }
    }
    
    private String extractDbHost(String url) {
        try { return url.split("://")[1].split(":")[0]; } catch (Exception e) { return "localhost"; }
    }
    
    private String extractDbPort(String url) {
        try { return url.split("://")[1].split(":")[1].split("/")[0]; } catch (Exception e) { return "5432"; }
    }

    public record BackupFileInfo(String fileName, String type, long sizeBytes, long timestamp) {}
}
