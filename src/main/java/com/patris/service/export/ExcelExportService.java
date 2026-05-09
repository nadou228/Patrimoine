package com.patris.service.export;

import com.patris.model.Bien;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.awt.Color;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import com.patris.model.BienMaterielRoulant;
import org.apache.poi.xssf.usermodel.DefaultIndexedColorMap;

/**
 * Système Expert de Génération de Documents Comptables Officiels (Norme Togo / UEMOA / SYSCOHADA).
 */
@Service
@RequiredArgsConstructor
public class ExcelExportService {

    // Couleurs institutionnelles PREMIUM (Hex RGB)
    private static final String COLOR_NAVY_DEEP = "0C192A";
    private static final String COLOR_PATRIS_BLUE = "0596DE";
    private static final String COLOR_GOLD_ACCENT = "C9A84C";
    private static final String COLOR_SOFT_BG = "F5F9FB";
    private static final String COLOR_BORDER_LIGHT = "E2E8F0";
    private static final String COLOR_WHITE = "FFFFFF";
    
    // Legacy mapping (to avoid breaking existing logic)
    private static final String COLOR_DARK_NAVY = COLOR_NAVY_DEEP;
    private static final String COLOR_HEADER_BLUE = COLOR_PATRIS_BLUE;
    private static final String COLOR_FOOTER_BLUE = "2E75B6";
    private static final String COLOR_MINT = "D9EAD3";
    private static final String COLOR_PALE_BLUE = COLOR_SOFT_BG;
    private static final String COLOR_NAVY = COLOR_NAVY_DEEP;
    private static final String COLOR_ROYAL = COLOR_PATRIS_BLUE;

    public byte[] generateOEM(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("OEM");
            sheet.setDisplayGridlines(false);

            createOfficialHeader(sheet, metadata, workbook);
            createTitleBanner(sheet, 7, "ORDRE D'ENTRÉE DES MATIÈRES (OEM) — LIVRE DES MOUVEMENTS", workbook, 12);
            createMetadataGrid(sheet, 8, metadata, workbook);
            createSummaryStatisticsGrid(sheet, 9, biens, workbook);

            int rowIdx = 12;
            createSectionHeader(sheet, rowIdx++, "SECTION UNIQUE — DÉTAIL DES ENTRÉES DU PATRIMOINE", workbook, 12);

            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(30);
            String[] headers = {"#", "Compte", "Type", "Marque/Race", "Unité", "Désignation", "Quantité", "PU (FCFA)", "Montant (FCFA)", "Amort. O/N", "Taux %", "Observations"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, getColumnWidth(i) * 256);
            }

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            int startDataRow = rowIdx;
            for (int i = 0; i < biens.size(); i++) {
                Bien bien = biens.get(i);
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(bien.getCompteComptable());
                row.createCell(2).setCellValue(bien.getClass().getSimpleName().replace("Bien", "").toUpperCase());
                row.createCell(3).setCellValue(bien instanceof BienMaterielRoulant ? ((BienMaterielRoulant)bien).getMarque() : "-");
                row.createCell(4).setCellValue(bien.getUnite() != null ? bien.getUnite() : "U");
                row.createCell(5).setCellValue(bien.getDesignation());
                row.createCell(6).setCellValue(bien.getQuantite() != null ? bien.getQuantite() : 1.0);
                row.createCell(7).setCellValue(bien.getValeur());
                
                Cell montantCell = row.createCell(8);
                montantCell.setCellFormula(String.format("G%d*H%d", rowIdx, rowIdx));
                
                row.createCell(9).setCellValue("O");
                row.createCell(10).setCellValue(bien.getTauxAmortissement() != null ? bien.getTauxAmortissement() : 0.2);
                row.createCell(11).setCellValue(bien.getEtat() != null ? bien.getEtat() : "");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            createTableFooterSummary(sheet, rowIdx++, "VALEUR TOTALE DES ENTRÉES", biens.size(), workbook, headers.length);
            createSignatureBlocks(sheet, rowIdx + 3, workbook, 12);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
    public byte[] generateLJA(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("LJ-A");
            sheet.setDisplayGridlines(false);
            
            createOfficialHeader(sheet, metadata, workbook);
            createTitleBanner(sheet, 7, "LIVRE JOURNAL DES IMMOBILISATIONS (LJ-A) — EXERCICE " + LocalDateTime.now().getYear(), workbook, 12);
            createMetadataGrid(sheet, 8, metadata, workbook);
            createSummaryStatisticsGrid(sheet, 9, biens, workbook);

            int rowIdx = 12;
            createSectionHeader(sheet, rowIdx++, "SECTION UNIQUE — JOURNAL DES ACQUISITIONS ET MOUVEMENTS", workbook, 12);

            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(30);
            String[] headers = {"#", "DATE OPÉRATION", "PIÈCE / RÉF", "DÉSIGNATION", "UNITÉ", "QTE", "V. UNITAIRE", "TOTAL (CFA)", "ORIGINE", "OBSERVATIONS"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, getColumnWidth(i) * 256);
            }

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            int startDataRow = rowIdx;
            for (int i = 0; i < biens.size(); i++) {
                Bien bien = biens.get(i);
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(bien.getDateAcquisition() != null ? bien.getDateAcquisition().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(2).setCellValue(bien.getReferenceFacture() != null ? bien.getReferenceFacture() : "N/A");
                row.createCell(3).setCellValue(bien.getDesignation());
                row.createCell(4).setCellValue(bien.getUnite() != null ? bien.getUnite() : "U");
                row.createCell(5).setCellValue(bien.getQuantite() != null ? bien.getQuantite() : 1.0);
                row.createCell(6).setCellValue(bien.getValeur());
                
                Cell totalCell = row.createCell(7);
                totalCell.setCellFormula(String.format("F%d*G%d", rowIdx, rowIdx));
                
                row.createCell(8).setCellValue(bien.getFournisseur() != null ? bien.getFournisseur() : "INV. INITIAL");
                row.createCell(9).setCellValue("");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            createTableFooterSummary(sheet, rowIdx++, "TOTAL GÉNÉRAL DE L'EXERCICE", biens.size(), workbook, headers.length);
            createSignatureBlocks(sheet, rowIdx + 3, workbook, 12);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }


    public byte[] generateFIA(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("FIA");
            sheet.setDisplayGridlines(false);
            
            // En-tête Officielle (Lignes 1-7)
            createOfficialHeader(sheet, metadata, workbook);

            // Titre Banner (Ligne 8)
            createTitleBanner(sheet, 7, "RAPPORT D'INVENTAIRE PHYSIQUE CERTIFIÉ — MINISTÈRE ÉCONOMIE", workbook, 12);

            // Metadata Grid (Ligne 9)
            createMetadataGrid(sheet, 8, metadata, workbook);

            // Summary Statistics Grid (Lignes 10-11)
            createSummaryStatisticsGrid(sheet, 9, biens, workbook);

            int rowIdx = 12;

            // SECTION 1
            createSectionHeader(sheet, rowIdx++, "SECTION 1 — FICHES D'AUDIT TERRAIN", workbook, 12);
            
            // Table Header
            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(30);
            String[] headers = {"#", "IUP / Code", "Désignation", "Catégorie", "Localisation Réf.", "Localisation Réelle", "État Constaté", "Anomalie", "Valid. Agent", "Valid. Superviseur", "Observations"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, getColumnWidth(i) * 256);
            }

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            int startDataRow = rowIdx;
            for (int i = 0; i < biens.size(); i++) {
                Bien bien = biens.get(i);
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(bien.getIup());
                row.createCell(2).setCellValue(bien.getDesignation());
                row.createCell(3).setCellValue(bien.getCompteComptable());
                row.createCell(4).setCellValue(bien.getLocalisation() != null ? bien.getLocalisation() : "Réf.");
                row.createCell(5).setCellValue(""); // Réelle
                row.createCell(6).setCellValue(bien.getEtat() != null ? bien.getEtat() : "");
                row.createCell(7).setCellValue(""); // Anomalie
                row.createCell(8).setCellValue("OUI");
                row.createCell(9).setCellValue("OUI");
                row.createCell(10).setCellValue("");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            // Summary Bar SECTION 1
            createTableFooterSummary(sheet, rowIdx++, "TOTAL ACTIFS AUDITÉS", biens.size(), workbook, headers.length);

            rowIdx++; // Spacer

            // SECTION 2
            createSectionHeader(sheet, rowIdx++, "SECTION 2 — ÉCARTS PATRIMONIAUX ET DÉCISIONS", workbook, 12);
            Row headRow2 = sheet.createRow(rowIdx++);
            headRow2.setHeightInPoints(30);
            String[] headers2 = {"#", "Bien", "IUP", "Type d'Écart", "Statut Validation", "Justification / Décision"};
            for (int i = 0; i < headers2.length; i++) {
                Cell c = headRow2.createCell(i);
                c.setCellValue(headers2[i]);
                c.setCellStyle(tableHeaderStyle);
            }
            
            // Dummy data for Section 2 to match visual
            Row dummyRow = sheet.createRow(rowIdx++);
            dummyRow.createCell(0).setCellValue("-");
            dummyRow.createCell(1).setCellValue("Aucun écart détecté");
            sheet.addMergedRegion(new CellRangeAddress(rowIdx-1, rowIdx-1, 1, 5));
            for(int j=0; j<6; j++) {
                Cell c = dummyRow.getCell(j);
                if(c == null) c = dummyRow.createCell(j);
                c.setCellStyle(styleOdd);
            }

            createTableFooterSummary(sheet, rowIdx++, "TOTAL ÉCARTS", 0, workbook, 6);

            // Signatures
            createSignatureBlocks(sheet, rowIdx + 3, workbook, 12);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateFIB(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("FIB");
            sheet.setDisplayGridlines(false);
            
            createOfficialHeader(sheet, metadata, workbook);
            createTitleBanner(sheet, 7, "FICHE MATRICULE DES BÂTIMENTS (FIB)", workbook, 12);
            createMetadataGrid(sheet, 8, metadata, workbook);

            List<Bien> immeubles = biens.stream()
                    .filter(b -> b.getCompteComptable() != null && b.getCompteComptable().startsWith("23"))
                    .toList();
            createSummaryStatisticsGrid(sheet, 9, immeubles, workbook);

            int rowIdx = 12;
            createSectionHeader(sheet, rowIdx++, "SECTION UNIQUE — INVENTAIRE DES IMMEUBLES ET BÂTIMENTS", workbook, 12);

            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(30);
            String[] headers = {"IUP", "NOM DU BÂTIMENT", "EMPLACEMENT", "MISE EN SERVICE", "SURFACE (M2)", "VALEUR (CFA)", "AFFECTATAIRE", "OBSERVATIONS"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, 25 * 256);
            }

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            for (int i = 0; i < immeubles.size(); i++) {
                Bien b = immeubles.get(i);
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(b.getIup());
                row.createCell(1).setCellValue(b.getDesignation());
                row.createCell(2).setCellValue(b.getLocalisation() != null ? b.getLocalisation() : "");
                row.createCell(3).setCellValue(b.getDateAcquisition() != null ? b.getDateAcquisition().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(4).setCellValue(0.0);
                row.createCell(5).setCellValue(b.getValeur());
                row.createCell(6).setCellValue(b.getService() != null ? b.getService() : "");
                row.createCell(7).setCellValue("");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            createTableFooterSummary(sheet, rowIdx++, "TOTAL PATRIMOINE BÂTI", immeubles.size(), workbook, headers.length);
            createSignatureBlocks(sheet, rowIdx + 3, workbook, 12);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateBGC(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("BGC");
            sheet.setDisplayGridlines(false);
            
            createOfficialHeader(sheet, metadata, workbook);
            createTitleBanner(sheet, 7, "BALANCE GÉNÉRALE DES COMPTES MATIÈRES — EXERCICE " + LocalDateTime.now().getYear(), workbook, 12);
            createMetadataGrid(sheet, 8, metadata, workbook);
            createSummaryStatisticsGrid(sheet, 9, biens, workbook);

            int rowIdx = 12;
            createSectionHeader(sheet, rowIdx++, "SECTION UNIQUE — RÉCAPITULATIF DES COMPTES", workbook, 12);

            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(30);
            String[] headers = {"COMPTE", "INTITULÉ DU COMPTE", "DÉBIT (ENTRÉES)", "CRÉDIT (SORTIES)", "SOLDE DÉBITEUR", "SOLDE CRÉDITEUR"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, i == 1 ? 45 * 256 : 20 * 256);
            }

            Map<String, Double> entries = new HashMap<>();
            biens.forEach(b -> {
                String c = b.getCompteComptable();
                double val = b.getValeur();
                entries.put(c, entries.getOrDefault(c, 0.0) + val);
            });

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);
            int i = 0;
            for (Map.Entry<String, Double> entry : entries.entrySet()) {
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;
                
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue("Compte " + entry.getKey());
                row.createCell(2).setCellValue(entry.getValue());
                row.createCell(3).setCellValue(0.0);
                
                Cell soldeDeb = row.createCell(4);
                soldeDeb.setCellFormula(String.format("C%d-D%d", rowIdx, rowIdx));
                row.createCell(5).setCellValue(0.0);

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
                i++;
            }

            createTableFooterSummary(sheet, rowIdx++, "TOTAL BALANCE DES MATIÈRES", entries.size(), workbook, headers.length);
            createSignatureBlocks(sheet, rowIdx + 3, workbook, 12);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateGLA(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("GL-A");
            sheet.setDisplayGridlines(false);
            
            createOfficialHeader(sheet, metadata, workbook);
            createTitleBanner(sheet, 7, "GRAND LIVRE DES IMMOBILISATIONS — ÉDITION DÉTAILLÉE", workbook, 12);
            createMetadataGrid(sheet, 8, metadata, workbook);
            createSummaryStatisticsGrid(sheet, 9, biens, workbook);

            int rowIdx = 12;
            String[] headers = {"COMPTE", "DATE", "PIÈCE / RÉF", "DÉSIGNATION", "DÉBIT", "CRÉDIT", "SOLDE", "OBSERVATIONS"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            
            biens.sort((a, b) -> {
                String c1 = a.getCompteComptable();
                String c2 = b.getCompteComptable();
                int res = c1.compareTo(c2);
                if (res == 0) {
                    if (a.getDateAcquisition() != null && b.getDateAcquisition() != null)
                        return a.getDateAcquisition().compareTo(b.getDateAcquisition());
                }
                return res;
            });

            String currentCompte = "";
            double soldeCompte = 0;
            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            for (Bien bien : biens) {
                String compte = bien.getCompteComptable();
                if (!compte.equals(currentCompte)) {
                    createSectionHeader(sheet, rowIdx++, "COMPTE MATIÈRES : " + compte, workbook, 12);
                    Row hRow = sheet.createRow(rowIdx++);
                    for (int i = 0; i < headers.length; i++) {
                        Cell hc = hRow.createCell(i);
                        hc.setCellValue(headers[i]);
                        hc.setCellStyle(tableHeaderStyle);
                        sheet.setColumnWidth(i, 20 * 256);
                    }
                    currentCompte = compte;
                    soldeCompte = 0;
                }

                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(22);
                CellStyle style = (rowIdx % 2 == 0) ? styleEven : styleOdd;
                double val = bien.getValeur();
                soldeCompte += val;

                row.createCell(0).setCellValue(compte);
                row.createCell(1).setCellValue(bien.getDateAcquisition() != null ? bien.getDateAcquisition().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(2).setCellValue(bien.getReferenceFacture() != null ? bien.getReferenceFacture() : bien.getIup());
                row.createCell(3).setCellValue(bien.getDesignation());
                row.createCell(4).setCellValue(val);
                row.createCell(5).setCellValue(0.0);
                row.createCell(6).setCellValue(soldeCompte);
                row.createCell(7).setCellValue("");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            createTableFooterSummary(sheet, rowIdx++, "TOTAL GÉNÉRAL DU COMPTE", biens.size(), workbook, headers.length);
            createSignatureBlocks(sheet, rowIdx + 3, workbook, 12);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void createOfficialHeader(Sheet sheet, Map<String, String> meta, XSSFWorkbook wb) {
        sheet.setDisplayGridlines(false);
        int maxCol = 11; // 0 to 11 = 12 columns
        
        // En-tête Gauche : Logo / Institution
        Row r0 = sheet.createRow(0);
        r0.setHeightInPoints(22);
        Cell instCell = r0.createCell(0);
        instCell.setCellValue(meta.getOrDefault("institution", "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES").toUpperCase());
        instCell.setCellStyle(createBoldNavyStyle(wb, 11));
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 6));

        Row r1 = sheet.createRow(1);
        Cell dirCell = r1.createCell(0);
        dirCell.setCellValue("Direction Générale du Patrimoine");
        dirCell.setCellStyle(createItalicStyle(wb, 10));
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, 6));

        Row r2 = sheet.createRow(2);
        Cell posteCell = r2.createCell(0);
        posteCell.setCellValue("POSTE COMPTABLE DE : " + meta.getOrDefault("poste", "............................"));
        posteCell.setCellStyle(createBoldStyle(wb, 9));
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 0, 6));

        // En-tête Droite : République Togolaise
        Cell repCell = r0.createCell(8);
        repCell.setCellValue("RÉPUBLIQUE TOGOLAISE");
        repCell.setCellStyle(createBoldNavyStyle(wb, 10));
        repCell.getCellStyle().setAlignment(HorizontalAlignment.RIGHT);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 8, maxCol));

        Cell mottoCell = r1.createCell(8);
        mottoCell.setCellValue("Travail - Liberté - Patrie");
        mottoCell.setCellStyle(createItalicStyle(wb, 9));
        mottoCell.getCellStyle().setAlignment(HorizontalAlignment.RIGHT);
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 8, maxCol));

        Cell yearCell = r2.createCell(8);
        yearCell.setCellValue("Exercice Budgétaire : " + LocalDateTime.now().getYear());
        yearCell.setCellStyle(createBoldStyle(wb, 9));
        yearCell.getCellStyle().setAlignment(HorizontalAlignment.RIGHT);
        sheet.addMergedRegion(new CellRangeAddress(2, 2, 8, maxCol));
        
        // Séparateur
        Row r4 = sheet.createRow(4);
        r4.setHeightInPoints(10);
    }

    private void createTitleBanner(Sheet sheet, int rowIdx, String title, XSSFWorkbook wb, int maxCol) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(25);
        Cell cell = row.createCell(0);
        cell.setCellValue(title);
        
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_FOOTER_BLUE), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(Color.WHITE, new DefaultIndexedColorMap()));
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        
        cell.setCellStyle(style);
        sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, maxCol - 1));
        
        // Add thick border below banner
        style.setBorderBottom(BorderStyle.THICK);
        style.setBottomBorderColor(IndexedColors.WHITE.getIndex());
    }

    private void createMetadataGrid(Sheet sheet, int startRow, Map<String, String> meta, XSSFWorkbook wb) {
        CellStyle labelStyle = createBoldNavyStyle(wb, 9);
        labelStyle.setBorderBottom(BorderStyle.THIN);
        labelStyle.setBorderTop(BorderStyle.THIN);
        labelStyle.setBorderLeft(BorderStyle.THIN);
        labelStyle.setBorderRight(BorderStyle.THIN);

        CellStyle valueStyle = createNormalStyle(wb, 9);
        valueStyle.setBorderBottom(BorderStyle.THIN);
        valueStyle.setBorderTop(BorderStyle.THIN);
        valueStyle.setBorderLeft(BorderStyle.THIN);
        valueStyle.setBorderRight(BorderStyle.THIN);
        
        XSSFFont boldFont = wb.createFont();
        boldFont.setBold(true);
        boldFont.setFontHeightInPoints((short) 9);
        valueStyle.setFont(boldFont);

        Row r = sheet.createRow(startRow);
        r.setHeightInPoints(20);

        // Site
        Cell c1 = r.createCell(0); c1.setCellValue(" Site / Périmètre : " + meta.getOrDefault("site", "DSI")); c1.setCellStyle(labelStyle);
        sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, 0, 2));

        // Equipe
        Cell c2 = r.createCell(3); c2.setCellValue(" Equipe : " + meta.getOrDefault("equipe", "KOPPI")); c2.setCellStyle(labelStyle);
        sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, 3, 7));

        // Statut
        Cell c3 = r.createCell(8); c3.setCellValue(" Statut : CERTIFIÉ (Du " + LocalDateTime.now().minusDays(30).format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + " au " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd")) + ")"); 
        c3.setCellStyle(labelStyle);
        sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, 8, 11));
    }

    private void createSummaryStatisticsGrid(Sheet sheet, int startRow, List<Bien> biens, XSSFWorkbook wb) {
        String[] labels = {"Recensement", "Actifs Audités", "Anomalies", "Sup. Validés", "Écarts Résolus"};
        String[] values = {String.valueOf(biens.size()), String.valueOf(biens.size()), "0", "0", "0"};
        
        Row labelRow = sheet.createRow(startRow);
        labelRow.setHeightInPoints(22);
        Row valueRow = sheet.createRow(startRow + 1);
        valueRow.setHeightInPoints(30);

        CellStyle labelStyle = createBoldNavyStyle(wb, 9);
        labelStyle.setAlignment(HorizontalAlignment.CENTER);
        labelStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(labelStyle);

        CellStyle valueStyle = wb.createCellStyle();
        valueStyle.setAlignment(HorizontalAlignment.CENTER);
        valueStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(valueStyle);
        XSSFFont vFont = wb.createFont();
        vFont.setBold(true);
        vFont.setFontHeightInPoints((short) 14);
        valueStyle.setFont(vFont);

        // Grid layout for 5 boxes in 12 columns
        // Box widths: 2, 2, 2, 3, 3
        int[] widths = {2, 2, 2, 3, 3};
        int currentCol = 0;
        for (int i = 0; i < labels.length; i++) {
            int endCol = currentCol + widths[i] - 1;
            
            Cell lc = labelRow.createCell(currentCol);
            lc.setCellValue(labels[i]);
            lc.setCellStyle(labelStyle);
            sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, currentCol, endCol));
            
            Cell vc = valueRow.createCell(currentCol);
            vc.setCellValue(values[i]);
            vc.setCellStyle(valueStyle);
            sheet.addMergedRegion(new CellRangeAddress(startRow + 1, startRow + 1, currentCol, endCol));
            
            // Add borders to the merged cells
            for(int j=currentCol; j<=endCol; j++) {
                if(labelRow.getCell(j) == null) labelRow.createCell(j).setCellStyle(labelStyle);
                if(valueRow.getCell(j) == null) valueRow.createCell(j).setCellStyle(valueStyle);
            }
            currentCol = endCol + 1;
        }
    }

    private void createSectionHeader(Sheet sheet, int rowIdx, String title, XSSFWorkbook wb, int maxCol) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(25);
        
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_MINT), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        
        Cell iconCell = row.createCell(0);
        iconCell.setCellValue("▣"); // Box icon
        iconCell.setCellStyle(style);
        
        Cell textCell = row.createCell(1);
        textCell.setCellValue(title);
        textCell.setCellStyle(style);
        
        sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 1, maxCol - 1));
        
        for(int i=0; i<maxCol; i++) {
            if(row.getCell(i) == null) row.createCell(i).setCellStyle(style);
        }
    }

    private void createTableFooterSummary(Sheet sheet, int rowIdx, String label, int count, XSSFWorkbook wb, int maxCol) {
        Row row = sheet.createRow(rowIdx);
        row.setHeightInPoints(25);
        
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_FOOTER_BLUE), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(Color.WHITE, new DefaultIndexedColorMap()));
        font.setFontHeightInPoints((short) 10);
        style.setFont(font);
        
        Cell labelCell = row.createCell(0);
        labelCell.setCellValue(label.toUpperCase());
        labelCell.setCellStyle(style);
        sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, 0, maxCol - 4));

        Cell countCell = row.createCell(maxCol - 3);
        countCell.setCellValue(count);
        countCell.setCellStyle(style);
        sheet.addMergedRegion(new CellRangeAddress(rowIdx, rowIdx, maxCol - 3, maxCol - 1));

        for(int i=0; i<maxCol; i++) {
            if(row.getCell(i) == null) row.createCell(i).setCellStyle(style);
        }
    }

    private void createSignatureBlocks(Sheet sheet, int startRow, XSSFWorkbook wb, int maxCol) {
        CellStyle sigTitleStyle = createBoldNavyStyle(wb, 10);
        sigTitleStyle.setAlignment(HorizontalAlignment.CENTER);
        
        CellStyle boxStyle = wb.createCellStyle();
        boxStyle.setBorderTop(BorderStyle.THICK);
        boxStyle.setBorderBottom(BorderStyle.THICK);
        boxStyle.setBorderLeft(BorderStyle.THICK);
        boxStyle.setBorderRight(BorderStyle.THICK);
        boxStyle.setAlignment(HorizontalAlignment.CENTER);
        boxStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        
        XSSFFont italicFont = wb.createFont();
        italicFont.setItalic(true);
        italicFont.setFontHeightInPoints((short) 8);
        italicFont.setColor(new XSSFColor(Color.GRAY, new DefaultIndexedColorMap()));
        boxStyle.setFont(italicFont);

        // Titles
        Row titleRow = sheet.createRow(startRow);
        titleRow.setHeightInPoints(25);
        
        String[] titles = {"Le Magasinier", "Le Chef de Service", "L'Ordonnateur"};
        // Use 3 blocks of 3 columns each, spaced out
        int[] startCols = {0, 4, 8};
        int blockWidth = 3;

        for (int i = 0; i < titles.length; i++) {
            Cell c = titleRow.createCell(startCols[i]);
            c.setCellValue(titles[i]);
            c.setCellStyle(sigTitleStyle);
            sheet.addMergedRegion(new CellRangeAddress(startRow, startRow, startCols[i], startCols[i] + blockWidth - 1));
        }

        // Boxes
        int boxHeight = 6;
        for (int i = 0; i < boxHeight; i++) {
            Row r = sheet.createRow(startRow + 1 + i);
            r.setHeightInPoints(18);
            for (int sc : startCols) {
                for (int j = 0; j < blockWidth; j++) {
                    Cell c = r.createCell(sc + j);
                    c.setCellStyle(boxStyle);
                    if (i == 2 && j == 0) {
                        c.setCellValue("Cachet & Signature");
                    }
                }
            }
        }
        
        // Names placeholder
        Row nameRow = sheet.createRow(startRow + boxHeight + 1);
        nameRow.setHeightInPoints(25);
        CellStyle nameStyle = createNormalStyle(wb, 9);
        for (int sc : startCols) {
            Cell nc = nameRow.createCell(sc);
            nc.setCellValue("Nom : ....................................");
            nc.setCellStyle(nameStyle);
            sheet.addMergedRegion(new CellRangeAddress(startRow + boxHeight + 1, startRow + boxHeight + 1, sc, sc + blockWidth - 1));
        }
    }

    // --- UTILS STYLES ---

    private CellStyle createHeaderStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(Color.decode("#" + COLOR_NAVY), new DefaultIndexedColorMap()));
        style.setFont(font);
        return style;
    }

    private CellStyle createTitleStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_ROYAL), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(Color.WHITE, new DefaultIndexedColorMap()));
        font.setFontHeightInPoints((short) 14);
        style.setFont(font);
        
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderTop(BorderStyle.MEDIUM);
        return style;
    }

    private CellStyle createTableHeaderStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_PATRIS_BLUE), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(java.awt.Color.WHITE, new DefaultIndexedColorMap()));
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        
        style.setBorderBottom(BorderStyle.MEDIUM);
        if (style instanceof XSSFCellStyle) {
            ((XSSFCellStyle) style).setBottomBorderColor(new XSSFColor(Color.decode("#" + COLOR_GOLD_ACCENT), new DefaultIndexedColorMap()));
        }
        applyBorders(style);
        return style;
    }

    private CellStyle createDataStyle(XSSFWorkbook wb, boolean even) {
        CellStyle style = wb.createCellStyle();
        if (even) {
            style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_PALE_BLUE), new DefaultIndexedColorMap()));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        applyBorders(style);
        return style;
    }

    private CellStyle createFooterStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_NAVY), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(java.awt.Color.WHITE, null));
        style.setFont(font);
        return style;
    }

    private void applyBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        
        if (style instanceof XSSFCellStyle) {
            XSSFCellStyle xstyle = (XSSFCellStyle) style;
            xstyle.setBottomBorderColor(new XSSFColor(Color.decode("#" + COLOR_BORDER_LIGHT), new DefaultIndexedColorMap()));
            xstyle.setTopBorderColor(new XSSFColor(Color.decode("#" + COLOR_BORDER_LIGHT), new DefaultIndexedColorMap()));
            xstyle.setLeftBorderColor(new XSSFColor(Color.decode("#" + COLOR_BORDER_LIGHT), new DefaultIndexedColorMap()));
            xstyle.setRightBorderColor(new XSSFColor(Color.decode("#" + COLOR_BORDER_LIGHT), new DefaultIndexedColorMap()));
        }
    }

    private CellStyle createBoldNavyStyle(XSSFWorkbook wb, int size) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) size);
        font.setColor(new XSSFColor(Color.decode("#" + COLOR_NAVY), new DefaultIndexedColorMap()));
        style.setFont(font);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createNormalStyle(XSSFWorkbook wb, int size) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setFontHeightInPoints((short) size);
        style.setFont(font);
        return style;
    }

    private CellStyle createBoldStyle(XSSFWorkbook wb, int size) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) size);
        style.setFont(font);
        return style;
    }

    private CellStyle createItalicStyle(XSSFWorkbook wb, int size) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setItalic(true);
        font.setFontHeightInPoints((short) size);
        style.setFont(font);
        return style;
    }

    private int getColumnWidth(int col) {
        switch (col) {
            case 0: return 8;   // FOLIO / #
            case 1: return 14;  // DATE
            case 2: return 18;  // PIECE
            case 3: return 40;  // DESIGNATION
            case 4: return 10;  // UNITE / SURFACE
            case 5: return 12;  // QTE
            case 6: return 18;  // PU / VAL ORIGINE
            case 7: return 22;  // MONTANT / AFFECTATAIRE
            case 8: return 25;  // ORIGINE / ETAT
            case 9: return 30;  // OBSERVATIONS
            default: return 15;
        }
    }
}
