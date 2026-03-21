package com.patris.service;

import org.springframework.stereotype.Service;
import java.util.UUID;
import java.time.Year;

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
    
    /**
     * Stub for generating QR Code base64 image or URL.
     * En production, utiliser une librairie comme ZXing (Zebra Crossing).
     */
    public String generateQrCodeBase64(String iup) {
        // TODO: Implémenter la génération du QR Code image
        return "data:image/png;base64,STUB_QR_CODE_" + iup;
    }
}
