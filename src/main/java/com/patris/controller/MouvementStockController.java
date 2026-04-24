package com.patris.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.dto.MouvementStockCreateDTO;
import com.patris.enums.type_mouvement;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.repository.MagasinRepository;
import com.patris.service.MouvementStockService;
import com.patris.service.StockService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/mouvement_stock")
@RequiredArgsConstructor
public class MouvementStockController {

    private final MouvementStockService service;
    private final StockService stockService;
    private final MagasinRepository magasinRepository;

    @GetMapping
    public List<MouvementStock> findAll(){
        return service.findAll();
    }
    
    @GetMapping("/{id}")
    public MouvementStock  findById(@PathVariable Long id){
        return service.findById(id);
    }

    @PostMapping
    public ResponseEntity<MouvementStock> create(@RequestBody MouvementStock mouvementStock){
        return ResponseEntity.ok(service.save(mouvementStock));
    }

    @PostMapping("/create")
    public ResponseEntity<MouvementStock> createFromDTO(@RequestBody MouvementStockCreateDTO dto){
        // Trouver le stock associé au consommable
        Stock stock = stockService.findByConsommableId(dto.getConsommableId());
        if (stock == null) {
            throw new RuntimeException("Aucun stock trouvé pour ce consommable");
        }

        // Créer le mouvement de stock
        MouvementStock mouvementStock = new MouvementStock();
        mouvementStock.setStock(stock);
        mouvementStock.setTypeMouvement(type_mouvement.valueOf(dto.getTypeOperation().toUpperCase()));
        mouvementStock.setQuantite(dto.getQuantite());
        mouvementStock.setDateMouvement(dto.getDateOperation());
        mouvementStock.setReferencePiece(dto.getPieceJustificative());
        mouvementStock.setPrixUnitaire(dto.getPrixUnitaire());
        mouvementStock.setDestination(dto.getObservations());
        mouvementStock.setServiceDemandeur(dto.getObservations());

        if (dto.getMagasinId() != null) {
            mouvementStock.setMagasin(
                magasinRepository.findById(dto.getMagasinId())
                    .orElseThrow(() -> new RuntimeException("Magasin introuvable"))
            );
        }

        return ResponseEntity.ok(service.save(mouvementStock));
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
