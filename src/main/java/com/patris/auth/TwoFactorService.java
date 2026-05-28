package com.patris.auth;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import com.patris.model.Utilisateur;
import com.patris.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class TwoFactorService {

    private static final String ISSUER = "PATRIS-SIGP";
    private final GoogleAuthenticator gAuth = new GoogleAuthenticator();
    private final UtilisateurRepository utilisateurRepository;

    /**
     * Génère une nouvelle clé secrète TOTP pour l'utilisateur.
     * Retourne la clé Base32 brute (à stocker chiffrée).
     */
    public String generateSecret() {
        GoogleAuthenticatorKey key = gAuth.createCredentials();
        return key.getKey();
    }

    /**
     * Génère l'URL TOTP standard compatible Google Authenticator.
     */
    public String generateOtpAuthUrl(String username, String secret) {
        return GoogleAuthenticatorQRGenerator.getOtpAuthTotpURL(ISSUER, username, 
            new GoogleAuthenticatorKey.Builder(secret).build());
    }

    /**
     * Génère un QR code PNG encodé en Base64 pour affichage direct en <img src=...>.
     */
    public String generateQrCodeBase64(String username, String secret) throws WriterException, IOException {
        String otpAuthUrl = generateOtpAuthUrl(username, secret);
        QRCodeWriter writer = new QRCodeWriter();
        BitMatrix matrix = writer.encode(otpAuthUrl, BarcodeFormat.QR_CODE, 250, 250);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);
        return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
    }

    /**
     * Vérifie le code TOTP à 6 chiffres fourni par l'utilisateur.
     */
    public boolean verifyCode(String secret, int code) {
        return gAuth.authorize(secret, code);
    }

    /**
     * Active la 2FA pour l'utilisateur : sauvegarde le secret et active le flag.
     */
    public void enableTwoFactor(Utilisateur user, String secret) {
        user.setTwoFactorSecret(secret);
        user.setTwoFactorEnabled(true);
        utilisateurRepository.save(user);
    }

    /**
     * Désactive la 2FA pour l'utilisateur.
     */
    public void disableTwoFactor(Utilisateur user) {
        user.setTwoFactorSecret(null);
        user.setTwoFactorEnabled(false);
        utilisateurRepository.save(user);
    }
}
