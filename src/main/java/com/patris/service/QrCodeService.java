package com.patris.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.Year;
import java.util.Base64;

@Service
public class QrCodeService {

    /**
     * Génère un Identifiant Unique Patrimonial (IUP) 
     * Structure: CT-LME-[CATEGORIE]-[ANNEE]-[SEQUENCE]
     */
    public String generateIUP(String categorieAbreviation, int sequenceCode) {
        String year = String.valueOf(Year.now().getValue());
        String sequence = String.format("%06d", sequenceCode);
        
        return String.format("CT-LME-%s-%s-%s", categorieAbreviation, year, sequence);
    }

    public String generateQrCodeBase64(String iup, String domain) {
        try {
            String url = String.format("https://%s/api/biens/scan/%s", domain, iup);
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(url, BarcodeFormat.QR_CODE, 300, 300);

            ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
            byte[] pngData = pngOutputStream.toByteArray();
            
            return Base64.getEncoder().encodeToString(pngData);
        } catch (Exception e) {
            throw new RuntimeException("Erreur lors de la génération du QR Code", e);
        }
    }
    
    public String generateQrCodeBase64(String iup) {
        return generateQrCodeBase64(iup, "localhost:8080");
    }
}
