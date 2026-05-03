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
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

// OpenPDF for PDF
import com.lowagie.text.Document;
import com.lowagie.text.Paragraph;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.PageSize;

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
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, baos);
            document.open();

            document.add(new Paragraph(title));
            document.add(new Paragraph(" ")); // Ligne vide

            List<Bien> biens = bienRepository.findAll();
            for (Bien bien : biens) {
                document.add(new Paragraph("IUP: " + bien.getIup()));
                document.add(new Paragraph("Désignation: " + bien.getDesignation()));
                document.add(new Paragraph("Catégorie: " + (bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : "N/A")));
                document.add(new Paragraph("Valeur: " + bien.getValeur()));
                document.add(new Paragraph("VNC: " + bien.getValeurNetteComptable()));
                document.add(new Paragraph("---"));
            }
        } catch (Exception e) {
            throw new IOException("Erreur lors de la génération du rapport PDF", e);
        } finally {
            if (document.isOpen()) {
                document.close();
            }
        }
        return baos.toByteArray();
    }

    /**
     * Génère un rapport Excel simple des biens.
     * @param sheetName Le nom de la feuille.
     * @return Les données Excel en tant que tableau d'octets.
     */
    public byte[] generateBienExcelReport(String sheetName) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            // Créer l'en-tête
            Row headerRow = sheet.createRow(0);
            String[] headers = {"IUP", "Désignation", "Catégorie", "Valeur", "VNC", "Date Acquisition"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
            }

            // Remplir les données
            List<Bien> biens = bienRepository.findAll();
            int rowNum = 1;
            for (Bien bien : biens) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(bien.getIup());
                row.createCell(1).setCellValue(bien.getDesignation());
                row.createCell(2).setCellValue(bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : "N/A");
                row.createCell(3).setCellValue(bien.getValeur());
                row.createCell(4).setCellValue(bien.getValeurNetteComptable());
                row.createCell(5).setCellValue(bien.getDateAcquisition().toString());
            }

            workbook.write(baos);
            return baos.toByteArray();

        } catch (Exception e) {
            throw new IOException("Erreur lors de la génération du rapport Excel", e);
        }
    }

    // Méthodes pour générer les documents spécifiques (BAM, BMM, PV, Livre Journal) viendront ici
}
