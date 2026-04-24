package com.patris.service;

import com.patris.enums.type_mouvement;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.StockRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MouvementStockService {

    private final MouvementStockRepository repository;
    private final StockRepository stockRepository;

    public MouvementStockService(MouvementStockRepository repository, StockRepository stockRepository) {
        this.repository = repository;
        this.stockRepository = stockRepository;
    }

    public List<MouvementStock> findAll() {
        return repository.findAll();
    }

    public MouvementStock findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mouvement stock introuvable"));
    }

    public MouvementStock save(MouvementStock mouvementStock) {
        Long stockId = mouvementStock.getStock().getId();
        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock introuvable"));

        if (mouvementStock.getTypeMouvement() == type_mouvement.SORTIE && stock.getQuantite() < mouvementStock.getQuantite()) {
            throw new RuntimeException("Stock insuffisant");
        }

        mouvementStock.setStock(stock);
        mouvementStock.setEstValide(false);
        return repository.save(mouvementStock);
    }

    public MouvementStock update(Long id, MouvementStock mvt) {
        MouvementStock mouvementStock = findById(id);
        mouvementStock.setTypeMouvement(mvt.getTypeMouvement());
        mouvementStock.setQuantite(mvt.getQuantite());
        mouvementStock.setDateMouvement(mvt.getDateMouvement());
        mouvementStock.setDestination(mvt.getDestination());
        mouvementStock.setReferencePiece(mvt.getReferencePiece());
        mouvementStock.setPrixUnitaire(mvt.getPrixUnitaire());
        mouvementStock.setFournisseur(mvt.getFournisseur());
        mouvementStock.setServiceDemandeur(mvt.getServiceDemandeur());
        mouvementStock.setMagasin(mvt.getMagasin());
        return repository.save(mouvementStock);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
