package com.patris.controller;

import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.extern.slf4j.Slf4j;
import lombok.RequiredArgsConstructor;

import com.patris.dto.MouvementStockCreateDTO;
import com.patris.enums.type_mouvement;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.service.MouvementStockService;
import com.patris.service.StockService;
import com.patris.repository.BeneficiaireRepository;
import com.patris.repository.MagasinRepository;

@RestController
@RequestMapping("/api/mouvement_stock")
@RequiredArgsConstructor
@Slf4j
public class MouvementStockController {

    private final MouvementStockService service;
    private final StockService stockService;
    private final MagasinRepository magasinRepository;
    private final BeneficiaireRepository beneficiaireRepository;

    @GetMapping
    public List<MouvementStock> findAll(){
        return service.findAll();
    }
    
    @GetMapping("/{id}")
    public MouvementStock findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<MouvementStock> create(@RequestBody MouvementStock mouvementStock){
        return ResponseEntity.ok(service.save(mouvementStock));
    }

    @PostMapping("/create")
    public ResponseEntity<MouvementStock> createFromDTO(@RequestBody MouvementStockCreateDTO dto){
        log.debug("Reception DTO mouvement stock: articleId={}, type={}, qte={}", 
            dto.getConsommableId(), dto.getTypeOperation(), dto.getQuantite());

        if (dto.getConsommableId() == null || dto.getConsommableId() <= 0) {
            throw new RuntimeException("Un article valide doit être sélectionné.");
        }

        // Trouver le stock associé au consommable
        Stock stock = stockService.findByConsommableId(dto.getConsommableId());
        if (stock == null) {
            throw new RuntimeException("Stock introuvable pour l'article sélectionné (ID: " + dto.getConsommableId() + "). Veuillez initialiser l'article.");
        }

        // Créer le mouvement de stock
        MouvementStock mouvementStock = new MouvementStock();
        mouvementStock.setStock(stock);
        
        try {
            mouvementStock.setTypeMouvement(type_mouvement.valueOf(dto.getTypeOperation().toUpperCase()));
        } catch (Exception e) {
            throw new RuntimeException("Type d'opération invalide: " + dto.getTypeOperation());
        }
        
        mouvementStock.setQuantite(dto.getQuantite());
        mouvementStock.setDateMouvement(dto.getDateOperation() != null ? dto.getDateOperation() : java.time.LocalDateTime.now());
        mouvementStock.setReferencePiece(dto.getPieceJustificative());
        mouvementStock.setPrixUnitaire(dto.getPrixUnitaire());
        mouvementStock.setFournisseur(dto.getFournisseur());
        
        String finalDestination = dto.getDestination() != null ? dto.getDestination() : "";
        String obs = dto.getObservations() != null ? dto.getObservations() : "";
        
        if (!obs.isEmpty()) {
            finalDestination += (finalDestination.isEmpty() ? "" : " | ") + "Obs: " + obs;
        }
        
        if (dto.getBeneficiaireLibre() != null && !dto.getBeneficiaireLibre().isEmpty()) {
            finalDestination += (finalDestination.isEmpty() ? "" : " | ") + "Bénéficiaire manuel : " + dto.getBeneficiaireLibre();
        }
        
        mouvementStock.setDestination(finalDestination);
        
        if (dto.getBeneficiaireId() != null) {
            mouvementStock.setBeneficiaire(
                beneficiaireRepository.findById(dto.getBeneficiaireId()).orElse(null)
            );
        }

        if (dto.getMagasinId() != null) {
            mouvementStock.setMagasin(
                magasinRepository.findById(dto.getMagasinId())
                    .orElseThrow(() -> new RuntimeException("Magasin introuvable"))
            );
        }

        log.debug("Mouvement construit: stockId={}, type={}, destination={}", 
            mouvementStock.getStock().getId(), mouvementStock.getTypeMouvement(), mouvementStock.getDestination());
        
        try {
            return ResponseEntity.ok(service.save(mouvementStock));
        } catch (Exception e) {
            log.error("Erreur lors de la sauvegarde du mouvement: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/{id}")
    public MouvementStock update(@PathVariable Long id, @RequestBody MouvementStock mouvementStock){
        return service.update(id, mouvementStock);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MouvementStock> delete(@PathVariable Long id){
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
