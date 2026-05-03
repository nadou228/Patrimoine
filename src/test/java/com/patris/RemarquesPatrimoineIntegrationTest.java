package com.patris;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.patris.enums.TypeBeneficiaire;
import com.patris.enums.type_mouvement;
import com.patris.model.Beneficiaire;
import com.patris.model.Consommable;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.repository.BeneficiaireRepository;
import com.patris.repository.ConsommableRepository;
import com.patris.repository.StockRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RemarquesPatrimoineIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StockRepository stockRepository;

    @Autowired
    private ConsommableRepository consommableRepository;

    @Autowired
    private BeneficiaireRepository beneficiaireRepository;

    private Long stockId;

    @BeforeEach
    void setupStock() {
        Consommable c = new Consommable();
        c.setCodeArticle("T-ART");
        c.setNomProduit("Article test");
        c.setSeuilAlerte(1);
        c.setUnite("u");
        c.setPrixMoyenPondere(10.0);
        consommableRepository.save(c);

        Stock stock = new Stock();
        stock.setQuantite(50);
        stock.setSeuilAlerte(1);
        stock.setUnite("u");
        stock.setConsommable(c);
        stockRepository.save(stock);
        stockId = stock.getId();
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void identificationQrByIup_returnsQrPayload() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MOBILIER");
        payload.put("designation", "Chaise test QR");
        payload.put("categorie", "MOB");
        payload.put("dateAcquisition", "2024-08-01");
        payload.put("valeur", 50000);
        payload.put("etat", "NEUF");
        payload.put("localisation", "Magasin");

        String raw = mockMvc.perform(post("/api/biens")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.iup").exists())
            .andReturn().getResponse().getContentAsString();

        String iup = objectMapper.readTree(raw).get("iup").asText();

        mockMvc.perform(get("/api/identification/qr/" + iup))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.qrcode").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void sortieStock_withoutBeneficiaire_returnsError() throws Exception {
        MouvementStock mvt = new MouvementStock();
        mvt.setTypeMouvement(type_mouvement.SORTIE);
        mvt.setQuantite(2);
        mvt.setDateMouvement(LocalDateTime.now());
        Stock ref = new Stock();
        ref.setId(stockId);
        mvt.setStock(ref);

        mockMvc.perform(post("/api/mouvement_stock")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(mvt)))
            .andExpect(status().isInternalServerError())
            .andExpect(jsonPath("$.message").value(containsString("bénéficiaire")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createBienFromStock_withoutSourceBeneficiaire_returnsBadRequest() throws Exception {
        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MOBILIER");
        payload.put("designation", "Immo depuis stock");
        payload.put("categorie", "MOB");
        payload.put("dateAcquisition", "2024-08-01");
        payload.put("valeur", 100000);
        payload.put("etat", "NEUF");
        payload.put("localisation", "Magasin");
        payload.put("sourceStockId", stockId);
        payload.put("sourceStockQuantite", 1);

        mockMvc.perform(post("/api/biens")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value(containsString("sourceBeneficiaireId")));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void createBienFromStock_withBeneficiaire_ok() throws Exception {
        Beneficiaire b = new Beneficiaire();
        b.setNom("Dupont");
        b.setPrenom("Jean");
        b.setType(TypeBeneficiaire.PERSONNE);
        beneficiaireRepository.save(b);

        Map<String, Object> payload = new HashMap<>();
        payload.put("type", "MOBILIER");
        payload.put("designation", "Immo depuis stock OK");
        payload.put("categorie", "MOB");
        payload.put("dateAcquisition", "2024-08-01");
        payload.put("valeur", 100000);
        payload.put("etat", "NEUF");
        payload.put("localisation", "Magasin");
        payload.put("sourceStockId", stockId);
        payload.put("sourceStockQuantite", 1);
        payload.put("sourceBeneficiaireId", b.getId());

        mockMvc.perform(post("/api/biens")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(payload)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").exists());

        Stock updated = stockRepository.findById(stockId).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(49, updated.getQuantite());
    }
}
