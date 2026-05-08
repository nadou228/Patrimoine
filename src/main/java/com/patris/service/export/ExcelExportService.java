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

    // Couleurs institutionnelles (Hex RGB)
    private static final String COLOR_NAVY = "0D1B3E";
    private static final String COLOR_ROYAL = "1B3A8C";
    private static final String COLOR_SKY = "2E75B6";
    private static final String COLOR_PALE = "BDD7EE";
    private static final String COLOR_GOLD = "C9A84C";
    private static final String COLOR_WHITE = "FFFFFF";
    private static final String COLOR_GREY_SIG = "E8E8E8";

    public byte[] generateOEM(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("OEM");
            sheet.setZoom(100);

            // Styles
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle titleStyle = createTitleStyle(workbook);
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            CellStyle dataStyleOdd = createDataStyle(workbook, false);
            CellStyle dataStyleEven = createDataStyle(workbook, true);
            CellStyle footerStyle = createFooterStyle(workbook);

            // 1. En-tête Officielle (Lignes 1-7)
            createOfficialHeader(sheet, metadata, workbook);

            // 2. Titre du Document (Ligne 8)
            Row titleRow = sheet.createRow(7);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("ORDRE D'ENTRÉE DES MATIÈRES (OEM)");
            titleCell.setCellStyle(titleStyle);
            sheet.addMergedRegion(new CellRangeAddress(7, 7, 0, 11));

            // 3. En-têtes de colonnes (Ligne 10)
            int rowIdx = 9;
            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(35);
            String[] headers = {"#", "Compte", "Type", "Marque/Race", "Unité", "Désignation", "Quantité", "PU (FCFA)", "Montant (FCFA)", "Amort. O/N", "Taux %", "Observations"};
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, getColumnWidth(i) * 256);
            }

            // 4. Corps des données
            double total = 0;
            int startDataRow = rowIdx;
            for (int i = 0; i < biens.size(); i++) {
                Bien bien = biens.get(i);
                Row row = sheet.createRow(rowIdx++);
                row.setHeightInPoints(25);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(i + 1);
                
                String compte = "2441";
                if (bien.getNomenclature() != null) compte = bien.getNomenclature().getCode();
                else if (bien.getCodeFamille() != null) compte = bien.getCodeFamille();
                
                row.createCell(1).setCellValue(compte);
                row.createCell(2).setCellValue(bien.getClass().getSimpleName().replace("Bien", "").toUpperCase());
                row.createCell(3).setCellValue(bien instanceof BienMaterielRoulant ? ((BienMaterielRoulant)bien).getMarque() : "-");
                row.createCell(4).setCellValue(bien.getUnite() != null ? bien.getUnite() : "Unité");
                row.createCell(5).setCellValue(bien.getDesignation());
                row.createCell(6).setCellValue(bien.getQuantite() != null ? bien.getQuantite() : 1.0);
                row.createCell(7).setCellValue(bien.getValeur());
                
                // Formule de montant : G*H
                Cell montantCell = row.createCell(8);
                montantCell.setCellFormula(String.format("G%d*H%d", rowIdx, rowIdx));
                
                row.createCell(9).setCellValue("O");
                row.createCell(10).setCellValue(bien.getTauxAmortissement() != null ? bien.getTauxAmortissement() : 0.2);
                row.createCell(11).setCellValue(bien.getEtat() != null ? bien.getEtat() : "");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            // 5. Ligne de Total
            Row totalRow = sheet.createRow(rowIdx++);
            totalRow.setHeightInPoints(35);
            Cell totalLabel = totalRow.createCell(0);
            totalLabel.setCellValue("VALEUR TOTALE DES ENTRÉES");
            totalLabel.setCellStyle(footerStyle);
            sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 7));
            
            Cell totalVal = totalRow.createCell(8);
            totalVal.setCellFormula(String.format("SUM(I%d:I%d)", startDataRow + 1, rowIdx - 1));
            totalVal.setCellStyle(footerStyle);
            
            // Signatures
            createSignatureBlocks(sheet, rowIdx + 2, workbook);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
    public byte[] generateLJA(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("LJ-A");
            createOfficialHeader(sheet, metadata, workbook);

            Row titleRow = sheet.createRow(7);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("LIVRE JOURNAL DES IMMOBILISATIONS (LJ-A)");
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(7, 7, 0, 10));

            int rowIdx = 9;
            Row headRow = sheet.createRow(rowIdx++);
            headRow.setHeightInPoints(35);
            String[] headers = {"FOLIO / N°", "DATE OPÉRATION", "PIÈCE JUSTIFICATIVE", "DÉSIGNATION DES MATIÈRES", "UNITÉ", "QTE ENTRÉE", "VALEUR UNITAIRE", "VALEUR TOTALE (CFA)", "ORIGINE / FOURNISSEUR", "OBSERVATIONS"};
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
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(bien.getDateAcquisition() != null ? bien.getDateAcquisition().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(2).setCellValue(bien.getReferenceFacture() != null ? bien.getReferenceFacture() : "N/A");
                row.createCell(3).setCellValue(bien.getDesignation());
                row.createCell(4).setCellValue(bien.getUnite() != null ? bien.getUnite() : (bien.getNomenclature() != null ? bien.getNomenclature().getUniteDefaut() : "U"));
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

            // Total row
            Row totalRow = sheet.createRow(rowIdx++);
            totalRow.setHeightInPoints(35);
            Cell totalLabel = totalRow.createCell(0);
            totalLabel.setCellValue("TOTAL GÉNÉRAL DE L'EXERCICE");
            totalLabel.setCellStyle(createFooterStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 6));

            Cell totVal = totalRow.createCell(7);
            totVal.setCellFormula(String.format("SUM(H%d:H%d)", startDataRow + 1, rowIdx - 1));
            totVal.setCellStyle(createFooterStyle(workbook));

            createSignatureBlocks(sheet, rowIdx + 2, workbook);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }


    public byte[] generateFIA(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("FIA");
            createOfficialHeader(sheet, metadata, workbook);

            Row titleRow = sheet.createRow(7);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("FICHE D'INVENTAIRE ANNUEL (FIA)");
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(7, 7, 0, 9));

            int rowIdx = 9;
            Row headRow = sheet.createRow(rowIdx++);
            String[] headers = {"#", "IUP", "DÉSIGNATION DES MATIÈRES", "COMPTE COMPTABLE", "LOCALISATION", "QUANTITÉ THÉORIQUE", "QUANTITÉ PHYSIQUE", "ÉCART", "ÉTAT PHYSIQUE", "OBSERVATIONS"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, getColumnWidth(i) * 256);
            }

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            for (int i = 0; i < biens.size(); i++) {
                Bien bien = biens.get(i);
                Row row = sheet.createRow(rowIdx++);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(i + 1);
                row.createCell(1).setCellValue(bien.getIup());
                row.createCell(2).setCellValue(bien.getDesignation());
                
                String compte = "2441";
                if (bien.getNomenclature() != null) compte = bien.getNomenclature().getCode();
                
                row.createCell(3).setCellValue(compte);
                row.createCell(4).setCellValue(bien.getLocalisation() != null ? bien.getLocalisation() : "");
                row.createCell(5).setCellValue(bien.getQuantite() != null ? bien.getQuantite() : 1.0);
                row.createCell(6).setCellValue(0.0); // Physique
                
                Cell ecart = row.createCell(7);
                ecart.setCellFormula(String.format("G%d-F%d", rowIdx, rowIdx));
                
                row.createCell(8).setCellValue(bien.getEtat() != null ? bien.getEtat() : "");
                row.createCell(9).setCellValue("");

                for (int j = 0; j < headers.length; j++) {
                    if (row.getCell(j) != null) row.getCell(j).setCellStyle(style);
                }
            }

            createSignatureBlocks(sheet, rowIdx + 2, workbook);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateFIB(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("FIB");
            createOfficialHeader(sheet, metadata, workbook);

            Row titleRow = sheet.createRow(7);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("FICHE MATRICULE DES BÂTIMENTS (FIB)");
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(7, 7, 0, 7));

            int rowIdx = 9;
            Row headRow = sheet.createRow(rowIdx++);
            String[] headers = {"IUP", "NOM DU BÂTIMENT", "EMPLACEMENT / LOCALISATION", "DATE DE MISE EN SERVICE", "SURFACE (M2)", "VALEUR D'ORIGINE (CFA)", "AFFECTATAIRE / SERVICE", "OBSERVATIONS"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, 25 * 256);
            }

            // Filtrer uniquement les immeubles (compte 23...)
            List<Bien> immeubles = biens.stream()
                    .filter(b -> b.getCompteComptable() != null && b.getCompteComptable().startsWith("23"))
                    .toList();

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);

            for (int i = 0; i < immeubles.size(); i++) {
                Bien b = immeubles.get(i);
                Row row = sheet.createRow(rowIdx++);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;

                row.createCell(0).setCellValue(b.getIup());
                row.createCell(1).setCellValue(b.getDesignation());
                row.createCell(2).setCellValue(b.getLocalisation() != null ? b.getLocalisation() : "");
                row.createCell(3).setCellValue(b.getDateAcquisition() != null ? b.getDateAcquisition().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
                row.createCell(4).setCellValue(0.0);
                row.createCell(5).setCellValue(b.getValeur() != null ? b.getValeur().doubleValue() : 0.0);
                row.createCell(6).setCellValue(b.getService() != null ? b.getService() : "");
                row.createCell(7).setCellValue("");

                for (int j = 0; j < headers.length; j++) {
                    row.getCell(j).setCellStyle(style);
                }
            }

            createSignatureBlocks(sheet, rowIdx + 2, workbook);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateBGC(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("BGC");
            createOfficialHeader(sheet, metadata, workbook);

            Row titleRow = sheet.createRow(7);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("BALANCE GÉNÉRALE DES COMPTES MATIÈRES");
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(7, 7, 0, 8));

            int rowIdx = 9;
            Row headRow = sheet.createRow(rowIdx++);
            String[] headers = {"COMPTE", "INTITULÉ DU COMPTE", "DÉBIT (ENTRÉES)", "CRÉDIT (SORTIES)", "SOLDE DÉBITEUR", "SOLDE CRÉDITEUR"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            for (int i = 0; i < headers.length; i++) {
                Cell c = headRow.createCell(i);
                c.setCellValue(headers[i]);
                c.setCellStyle(tableHeaderStyle);
                sheet.setColumnWidth(i, i == 1 ? 45 * 256 : 20 * 256);
            }

            // Grouping by account
            Map<String, Double> entries = new HashMap<>();
            biens.forEach(b -> {
                String c = "2441";
                if (b.getNomenclature() != null) c = b.getNomenclature().getCode();
                else if (b.getCodeFamille() != null) c = b.getCodeFamille();
                
                double val = b.getValeur();
                entries.put(c, entries.getOrDefault(c, 0.0) + val);
            });

            CellStyle styleOdd = createDataStyle(workbook, false);
            CellStyle styleEven = createDataStyle(workbook, true);
            int i = 0;
            for (Map.Entry<String, Double> entry : entries.entrySet()) {
                Row row = sheet.createRow(rowIdx++);
                CellStyle style = (i % 2 == 0) ? styleOdd : styleEven;
                
                row.createCell(0).setCellValue(entry.getKey());
                row.createCell(1).setCellValue("Compte " + entry.getKey()); // Simplified label
                row.createCell(2).setCellValue(entry.getValue());
                row.createCell(3).setCellValue(0.0);
                
                Cell soldeDeb = row.createCell(4);
                soldeDeb.setCellFormula(String.format("C%d-D%d", rowIdx, rowIdx));
                
                row.createCell(5).setCellValue(0.0);

                for (int j = 0; j < headers.length; j++) {
                    row.getCell(j).setCellStyle(style);
                }
                i++;
            }

            createSignatureBlocks(sheet, rowIdx + 2, workbook);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public byte[] generateGLA(List<Bien> biens, Map<String, String> metadata) throws IOException {
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("GL-A");
            createOfficialHeader(sheet, metadata, workbook);

            Row titleRow = sheet.createRow(7);
            titleRow.setHeightInPoints(30);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue("GRAND LIVRE DES IMMOBILISATIONS");
            titleCell.setCellStyle(createTitleStyle(workbook));
            sheet.addMergedRegion(new CellRangeAddress(7, 7, 0, 7));

            int rowIdx = 9;
            String[] headers = {"COMPTE", "DATE", "PIÈCE / RÉF", "DÉSIGNATION", "DÉBIT", "CRÉDIT", "SOLDE", "OBSERVATIONS"};
            CellStyle tableHeaderStyle = createTableHeaderStyle(workbook);
            
            // Sort by account and date
            biens.sort((a, b) -> {
                String c1 = a.getNomenclature() != null ? a.getNomenclature().getCode() : "";
                String c2 = b.getNomenclature() != null ? b.getNomenclature().getCode() : "";
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
                String compte = bien.getNomenclature() != null ? bien.getNomenclature().getCode() : "2441";
                if (!compte.equals(currentCompte)) {
                    // New account section
                    Row sectionRow = sheet.createRow(rowIdx++);
                    Cell c = sectionRow.createCell(0);
                    c.setCellValue("COMPTE : " + compte);
                    c.setCellStyle(createBoldNavyStyle(workbook, 10));
                    sheet.addMergedRegion(new CellRangeAddress(rowIdx - 1, rowIdx - 1, 0, 7));
                    
                    Row headRow = sheet.createRow(rowIdx++);
                    for (int i = 0; i < headers.length; i++) {
                        Cell hc = headRow.createCell(i);
                        hc.setCellValue(headers[i]);
                        hc.setCellStyle(tableHeaderStyle);
                        sheet.setColumnWidth(i, 20 * 256);
                    }
                    currentCompte = compte;
                    soldeCompte = 0;
                }

                Row row = sheet.createRow(rowIdx++);
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

            createSignatureBlocks(sheet, rowIdx + 2, workbook);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }
    private void createOfficialHeader(Sheet sheet, Map<String, String> meta, XSSFWorkbook wb) {
        // En-tête Gauche : Logo / Institution
        Row r1 = sheet.createRow(0);
        Cell instCell = r1.createCell(0);
        instCell.setCellValue(meta.getOrDefault("institution", "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES"));
        instCell.setCellStyle(createBoldNavyStyle(wb, 12));
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 4));

        Row r2 = sheet.createRow(1);
        Cell posteCell = r2.createCell(0);
        posteCell.setCellValue("POSTE COMPTABLE : " + meta.getOrDefault("poste", "CENTRAL"));
        posteCell.setCellStyle(createNormalStyle(wb, 10));

        // En-tête Droite : République Togolaise
        Cell repCell = r1.createCell(10);
        repCell.setCellValue("RÉPUBLIQUE TOGOLAISE");
        repCell.setCellStyle(createBoldNavyStyle(wb, 10));
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 10, 11));

        Row r2d = sheet.getRow(1);
        Cell mottoCell = r2d.createCell(10);
        mottoCell.setCellValue("Travail - Liberté - Patrie");
        mottoCell.setCellStyle(createItalicStyle(wb, 9));
        sheet.addMergedRegion(new CellRangeAddress(1, 1, 10, 11));
    }

    private void createSignatureBlocks(Sheet sheet, int startRow, XSSFWorkbook wb) {
        Row sigHeader = sheet.createRow(startRow);
        sigHeader.setHeightInPoints(25);
        String[] titles = {"Le Magasinier", "Le Chef de Service", "L'Ordonnateur"};
        int[] cols = {1, 5, 9};
        
        CellStyle sigTitleStyle = createBoldStyle(wb, 10);
        
        for (int i = 0; i < titles.length; i++) {
            Cell c = sigHeader.createCell(cols[i]);
            c.setCellValue(titles[i]);
            c.setCellStyle(sigTitleStyle);
        }
        
        Row sigNames = sheet.createRow(startRow + 1);
        for (int i = 0; i < cols.length; i++) {
            sigNames.createCell(cols[i]).setCellValue("(Nom et Prénoms)");
            sigNames.getCell(cols[i]).setCellStyle(createItalicStyle(wb, 9));
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
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_GOLD), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(Color.WHITE, new DefaultIndexedColorMap()));
        font.setFontHeightInPoints((short) 12);
        style.setFont(font);
        return style;
    }

    private CellStyle createTableHeaderStyle(XSSFWorkbook wb) {
        CellStyle style = wb.createCellStyle();
        style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_ROYAL), new DefaultIndexedColorMap()));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setColor(new XSSFColor(java.awt.Color.WHITE, null));
        style.setFont(font);
        applyBorders(style);
        return style;
    }

    private CellStyle createDataStyle(XSSFWorkbook wb, boolean even) {
        CellStyle style = wb.createCellStyle();
        if (even) {
            style.setFillForegroundColor(new XSSFColor(Color.decode("#" + COLOR_PALE), new DefaultIndexedColorMap()));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
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
    }

    private CellStyle createBoldNavyStyle(XSSFWorkbook wb, int size) {
        CellStyle style = wb.createCellStyle();
        XSSFFont font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) size);
        font.setColor(new XSSFColor(Color.decode("#" + COLOR_NAVY), new DefaultIndexedColorMap()));
        style.setFont(font);
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
