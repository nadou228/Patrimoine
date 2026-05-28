package com.patris.audit;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;
import java.util.Map;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.patris.model.Bien;
import com.patris.repository.BienRepository;

import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.patris.model.Utilisateur;
import com.patris.security.CustomUserDetails;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuditService {

    private static final DateTimeFormatter EXPORT_DATE_TIME = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", Locale.FRANCE);

    private final AuditLogRepository repository;
    private final BienRepository bienRepository;
    private final ObjectMapper objectMapper;

    public void save(String action, String entite, Long entiteId) {
        save(action, entite, entiteId, null, null, null, null, null);
    }

    public void save(String action, String entite, Long entiteId, String detail) {
        save(action, entite, entiteId, null, null, detail, null, null);
    }

    public void save(String action, String entite, Long entiteId, String detail, String ancienneValeur, String nouvelleValeur) {
        save(action, entite, entiteId, null, null, detail, ancienneValeur, nouvelleValeur);
    }

    public void save(String action, String entite, Long entiteId, String utilisateurLogin, String utilisateurNom, String details, String ancienneValeur, String nouvelleValeur) {
        save(action, entite, entiteId, utilisateurLogin, utilisateurNom, null, details, ancienneValeur, nouvelleValeur);
    }

    public void save(String action, String entite, Long entiteId, String utilisateurLogin, String utilisateurNom, String ipAdresse, String details, String ancienneValeur, String nouvelleValeur) {
        AuditActor actor = resolveActor();

        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setEntite(entite);
        log.setEntiteId(entiteId);
        log.setUsername(utilisateurLogin != null && !utilisateurLogin.isBlank() ? utilisateurLogin : actor.login());
        log.setUtilisateurLogin(utilisateurLogin != null && !utilisateurLogin.isBlank() ? utilisateurLogin : actor.login());
        log.setUtilisateurNom(utilisateurNom != null && !utilisateurNom.isBlank() ? utilisateurNom : actor.nom());
        log.setIpAdresse(ipAdresse != null && !ipAdresse.isBlank() ? ipAdresse : actor.ipAdresse());
        log.setDateAction(LocalDateTime.now());
        log.setDetail(details);
        log.setDetails(details);
        log.setAncienneValeur(ancienneValeur);
        log.setNouvelleValeur(nouvelleValeur);

        repository.save(log);
    }

    public void rollbackAction(Long auditId, String adminUser) {
        AuditLog log = repository.findById(auditId)
            .orElseThrow(() -> new RuntimeException("Log d'audit introuvable"));

        if (!"Bien".equals(log.getEntite()) || log.getEntiteId() == null) {
            throw new RuntimeException("Seules les actions sur les Biens peuvent être annulées pour l'instant");
        }

        Bien bien = bienRepository.findById(log.getEntiteId())
            .orElseThrow(() -> new RuntimeException("Bien introuvable (ID: " + log.getEntiteId() + ")"));

        if ("BIEN_ARCHIVE".equals(log.getAction())) {
            bien.setArchived(false);
            bienRepository.save(bien);
            save("ROLLBACK", "Bien", bien.getId(), adminUser, null, "Annulation de l'archivage (Restauration)", null, null);
            log.setAction("BIEN_ARCHIVE_RESTORED");
            repository.save(log);
        } else if ("BIEN_MODIFIE".equals(log.getAction())) {
            if (log.getAncienneValeur() != null && !log.getAncienneValeur().isBlank()) {
                try {
                    Map<String, Object> oldValues = objectMapper.readValue(log.getAncienneValeur(), new TypeReference<Map<String, Object>>() {});
                    if (oldValues.containsKey("valeur")) bien.setValeur(((Number) oldValues.get("valeur")).doubleValue());
                    if (oldValues.containsKey("localisation")) bien.setLocalisation((String) oldValues.get("localisation"));
                    if (oldValues.containsKey("service")) bien.setService((String) oldValues.get("service"));
                    bienRepository.save(bien);
                    save("ROLLBACK", "Bien", bien.getId(), adminUser, null, "Annulation de la modification", log.getNouvelleValeur(), log.getAncienneValeur());
                    log.setAction("BIEN_MODIFIE_RESTORED");
                    repository.save(log);
                } catch (Exception e) {
                    throw new RuntimeException("Erreur lors de la lecture des anciennes valeurs JSON: " + e.getMessage());
                }
            } else {
                throw new RuntimeException("Aucune ancienne valeur sauvegardée pour ce log");
            }
        } else {
            throw new RuntimeException("Action non supportée pour le rollback: " + log.getAction());
        }
    }

    public void hardDelete(Long auditId, String adminUser) {
        AuditLog log = repository.findById(auditId)
            .orElseThrow(() -> new RuntimeException("Log d'audit introuvable"));

        if (!"Bien".equals(log.getEntite()) || log.getEntiteId() == null) {
            throw new RuntimeException("Seules les suppressions définitives de Biens sont supportées.");
        }

        Bien bien = bienRepository.findById(log.getEntiteId()).orElse(null);
        if (bien != null) {
            bienRepository.delete(bien);
            save("BIEN_SUPPRIME_DEFINITIVEMENT", "Bien", log.getEntiteId(), adminUser, null, "Suppression définitive de la base de données", null, null);
        }

        log.setAction("BIEN_SUPPRIME_DEFINITIVEMENT");
        repository.save(log);
    }

    public Page<AuditLog> findLogs(int page, int size, String action, String utilisateur, String entite, LocalDate dateDebut, LocalDate dateFin) {
        List<AuditLog> filtered = repository.findAll().stream()
            .filter(log -> matches(action, log.getAction()))
            .filter(log -> matches(entite, log.getEntite()))
            .filter(log -> matchesUser(utilisateur, log))
            .filter(log -> matchesDateRange(log.getDateAction(), dateDebut, dateFin))
            .sorted(Comparator.comparing(AuditLog::getDateAction, Comparator.nullsLast(Comparator.reverseOrder())))
            .collect(Collectors.toList());

        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        int start = Math.min(safePage * safeSize, filtered.size());
        int end = Math.min(start + safeSize, filtered.size());

        return new PageImpl<>(filtered.subList(start, end), PageRequest.of(safePage, safeSize), filtered.size());
    }

    public byte[] exportLogsToExcel(String action, String utilisateur, String entite, LocalDate dateDebut, LocalDate dateFin) {
        List<AuditLog> logs = findLogs(0, Integer.MAX_VALUE, action, utilisateur, entite, dateDebut, dateFin).getContent();

        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream outputStream = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Journal audit");

            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle bodyStyle = createBodyStyle(workbook);

            Row titleRow = sheet.createRow(0);
            titleRow.createCell(0).setCellValue("Journal d'audit SIGP Patrimoine");
            titleRow.getCell(0).setCellStyle(titleStyle);

            Row headerRow = sheet.createRow(2);
            String[] headers = {"Date", "Action", "Entité", "ID Entité", "Utilisateur", "Nom", "IP", "Détails"};
            for (int i = 0; i < headers.length; i++) {
                headerRow.createCell(i).setCellValue(headers[i]);
                headerRow.getCell(i).setCellStyle(headerStyle);
            }

            int rowIndex = 3;
            for (AuditLog log : logs) {
                Row row = sheet.createRow(rowIndex++);
                row.createCell(0).setCellValue(log.getDateAction() != null ? log.getDateAction().format(EXPORT_DATE_TIME) : "");
                row.createCell(1).setCellValue(orEmpty(log.getAction()));
                row.createCell(2).setCellValue(orEmpty(log.getEntite()));
                row.createCell(3).setCellValue(log.getEntiteId() != null ? log.getEntiteId() : 0L);
                row.createCell(4).setCellValue(orEmpty(log.getUtilisateurLogin()));
                row.createCell(5).setCellValue(orEmpty(log.getUtilisateurNom()));
                row.createCell(6).setCellValue(orEmpty(log.getIpAdresse()));
                row.createCell(7).setCellValue(orEmpty(log.getDetails()));
                for (int i = 0; i < headers.length; i++) {
                    row.getCell(i).setCellStyle(bodyStyle);
                }
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(outputStream);
            return outputStream.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Impossible d'exporter le journal d'audit", exception);
        }
    }

    private boolean matches(String filter, String value) {
        if (filter == null || filter.isBlank()) {
            return true;
        }
        return value != null && value.toLowerCase(Locale.ROOT).contains(filter.toLowerCase(Locale.ROOT));
    }

    private boolean matchesUser(String filter, AuditLog log) {
        if (filter == null || filter.isBlank()) {
            return true;
        }
        String normalized = filter.toLowerCase(Locale.ROOT);
        return (log.getUtilisateurLogin() != null && log.getUtilisateurLogin().toLowerCase(Locale.ROOT).contains(normalized))
            || (log.getUtilisateurNom() != null && log.getUtilisateurNom().toLowerCase(Locale.ROOT).contains(normalized))
            || (log.getUsername() != null && log.getUsername().toLowerCase(Locale.ROOT).contains(normalized));
    }

    private boolean matchesDateRange(LocalDateTime value, LocalDate dateDebut, LocalDate dateFin) {
        if (value == null) {
            return dateDebut == null && dateFin == null;
        }
        LocalDateTime start = dateDebut != null ? dateDebut.atStartOfDay() : null;
        LocalDateTime end = dateFin != null ? dateFin.atTime(LocalTime.MAX) : null;
        boolean afterStart = start == null || !value.isBefore(start);
        boolean beforeEnd = end == null || !value.isAfter(end);
        return afterStart && beforeEnd;
    }

    private AuditActor resolveActor() {
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication == null) {
                return new AuditActor("system", "Système", null);
            }

            String login = authentication.getName();
            String nom = login;
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails userDetails) {
                Utilisateur utilisateur = userDetails.getUtilisateur();
                login = utilisateur.getUsername();
                nom = ((utilisateur.getPrenom() != null ? utilisateur.getPrenom() + " " : "") + (utilisateur.getNom() != null ? utilisateur.getNom() : utilisateur.getUsername())).trim();
            }
            return new AuditActor(login, nom.isBlank() ? login : nom, null);
        } catch (Exception exception) {
            return new AuditActor("system", "Système", null);
        }
    }

    private CellStyle createTitleStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        XSSFFont font = workbook.createFont();
        font.setBold(true);
        font.setFontHeight(15);
        style.setFont(font);
        return style;
    }

    private CellStyle createHeaderStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        XSSFFont font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createBodyStyle(XSSFWorkbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setWrapText(true);
        style.setVerticalAlignment(VerticalAlignment.TOP);
        return style;
    }

    private String orEmpty(String value) {
        return value == null ? "" : value;
    }

    private record AuditActor(
        String login,
        String nom,
        String ipAdresse
    ) {}
}
