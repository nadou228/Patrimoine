package com.patris.service;

import com.patris.model.Bien;
import com.patris.enums.typeDocument;
import com.patris.repository.BienRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

// Apache POI for Excel
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.PageSize;
import java.awt.Color;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.apache.poi.ss.util.CellRangeAddress;

@Service
@RequiredArgsConstructor
public class ReportingService {

    private final BienRepository bienRepository;

    /**
     * Génère un rapport PDF simple des biens.
     * @param title Le titre du rapport.
     * @return Les données PDF en tant que tableau d'octets.
     */
    public byte[] generateBienPdfReport(String title) throws IOException {
        Document document = new Document(PageSize.A4.rotate()); // Paysage pour plus de colonnes
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(13, 27, 62));
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 9);

            // Official Header
            Paragraph institution = new Paragraph("MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12));
            institution.setAlignment(Element.ALIGN_LEFT);
            document.add(institution);

            Paragraph rep = new Paragraph("RÉPUBLIQUE TOGOLAISE\nTravail - Liberté - Patrie", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10));
            rep.setAlignment(Element.ALIGN_RIGHT);
            document.add(rep);
            
            document.add(new Paragraph(" "));

            // Title Banner
            PdfPTable titleTable = new PdfPTable(1);
            titleTable.setWidthPercentage(100);
            PdfPCell titleCell = new PdfPCell(new Phrase(title.toUpperCase(), titleFont));
            titleCell.setBackgroundColor(new Color(201, 168, 76)); // Gold
            titleCell.setPadding(10);
            titleCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            titleCell.setBorder(Rectangle.NO_BORDER);
            titleTable.addCell(titleCell);
            document.add(titleTable);

            document.add(new Paragraph(" "));

            // Data Table
            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{3, 8, 4, 4, 4, 4, 5});

            String[] headers = {"IUP", "DÉSIGNATION", "CATÉGORIE", "VALEUR", "VNC", "ETAT", "DATE ACQ."};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(27, 58, 140)); // Royal Blue
                cell.setPadding(5);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            List<Bien> biens = bienRepository.findAll();
            boolean even = false;
            for (Bien bien : biens) {
                Color bg = even ? new Color(242, 247, 255) : Color.WHITE;
                addCell(table, bien.getIup(), dataFont, bg);
                addCell(table, bien.getDesignation(), dataFont, bg);
                addCell(table, bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : "N/A", dataFont, bg);
                addCell(table, String.format("%,.0f", bien.getValeur()), dataFont, bg);
                addCell(table, String.format("%,.0f", bien.getValeurNetteComptable() != null ? bien.getValeurNetteComptable() : 0.0), dataFont, bg);
                addCell(table, bien.getEtat() != null ? bien.getEtat() : "-", dataFont, bg);
                addCell(table, bien.getDateAcquisition() != null ? bien.getDateAcquisition().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "-", dataFont, bg);
                even = !even;
            }

            document.add(table);

            // Footer
            document.add(new Paragraph(" "));
            Paragraph footer = new Paragraph("Généré le : " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 8));
            footer.setAlignment(Element.ALIGN_RIGHT);
            document.add(footer);

        } catch (Exception e) {
            throw new IOException("Erreur lors de la génération du rapport PDF", e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }
        return baos.toByteArray();
    }

    private void addCell(PdfPTable table, String text, Font font, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setBackgroundColor(bg);
        cell.setPadding(4);
        cell.setBorderColor(new Color(232, 232, 232));
        table.addCell(cell);
    }

    /**
     * Génère un rapport Excel simple des biens.
     * @param sheetName Le nom de la feuille.
     * @return Les données Excel en tant que tableau d'octets.
     */
    public byte[] generateBienExcelReport(String sheetName) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);
            sheet.setDisplayGridlines(false);

            // Styles Premium
            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            org.apache.poi.ss.usermodel.Font hFont = workbook.createFont();
            hFont.setBold(true);
            hFont.setFontHeightInPoints((short) 11);
            hFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(hFont);
            applyStandardBorders(headerStyle);

            CellStyle evenRowStyle = workbook.createCellStyle();
            evenRowStyle.setFillForegroundColor(IndexedColors.PALE_BLUE.getIndex());
            evenRowStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            applyStandardBorders(evenRowStyle);

            CellStyle oddRowStyle = workbook.createCellStyle();
            applyStandardBorders(oddRowStyle);

            // Header
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(30);
            String[] headers = {"IUP", "Désignation", "Catégorie", "Valeur (CFA)", "VNC (CFA)", "Date Acquisition"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 22 * 256);
            }

            // Data
            List<Bien> biens = bienRepository.findAll();
            int rowNum = 1;
            for (Bien bien : biens) {
                Row row = sheet.createRow(rowNum++);
                row.setHeightInPoints(20);
                CellStyle currentStyle = (rowNum % 2 == 0) ? evenRowStyle : oddRowStyle;

                row.createCell(0).setCellValue(bien.getIup());
                row.createCell(1).setCellValue(bien.getDesignation());
                row.createCell(2).setCellValue(bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : "N/A");
                row.createCell(3).setCellValue(bien.getValeur());
                row.createCell(4).setCellValue(bien.getValeurNetteComptable() != null ? bien.getValeurNetteComptable() : 0.0);
                row.createCell(5).setCellValue(bien.getDateAcquisition() != null ? bien.getDateAcquisition().toString() : "-");

                for (int i = 0; i < headers.length; i++) {
                    row.getCell(i).setCellStyle(currentStyle);
                }
            }
            sheet.setAutoFilter(new CellRangeAddress(0, rowNum - 1, 0, headers.length - 1));

            workbook.write(baos);
            return baos.toByteArray();

        } catch (Exception e) {
            throw new IOException("Erreur lors de la génération du rapport Excel", e);
        }
    }

    private void applyStandardBorders(CellStyle style) {
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
    }

    // Méthodes pour générer les documents spécifiques (BAM, BMM, PV, Livre Journal) viendront ici
}
