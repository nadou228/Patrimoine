package com.patris.controller;

import com.patris.dto.IdentificationDto;
import com.patris.service.BienService;
import com.patris.service.QrCodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/identification")
@RequiredArgsConstructor
public class IdentificationController {

    private final BienService bienService;
    private final QrCodeService qrCodeService;

    @org.springframework.beans.factory.annotation.Value("${app.domain:localhost:8082}")
    private String appDomain;

    @GetMapping("/label/{iup}")
    public ResponseEntity<IdentificationDto> getLabelData(@PathVariable String iup) {
        return ResponseEntity.ok(bienService.getIdentificationData(iup));
    }

    @GetMapping("/qr/{iup}")
    public ResponseEntity<Map<String, String>> getQrCodeByIup(@PathVariable String iup) {
        bienService.findByIup(iup);
        String qrCode = qrCodeService.generateQrCodeBase64(iup, appDomain);
        Map<String, String> response = new HashMap<>();
        response.put("qrcode", qrCode);
        return ResponseEntity.ok(response);
    }
}
