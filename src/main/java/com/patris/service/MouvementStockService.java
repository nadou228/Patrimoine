package com.patris.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.patris.enums.type_mouvement;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.StockRepository;

@Service
public class MouvementStockService {

    private final MouvementStockRepository repository;
    private final StockRepository stockRepository;

    public MouvementStockService(MouvementStockRepository repository,
                                  StockRepository stockRepository) {
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
        // Résolution du stock
        Long stockId = mouvementStock.getStock().getId();
        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock introuvable"));

        // Mise à jour de la quantité selon le type de mouvement
        if (mouvementStock.getTypeMouvement() == type_mouvement.ENTREE) {
            stock.setQuantite(stock.getQuantite() + mouvementStock.getQuantite());
        } else if (mouvementStock.getTypeMouvement() == type_mouvement.SORTIE) {
            if (stock.getQuantite() < mouvementStock.getQuantite()) {
                throw new RuntimeException("Stock insuffisant pour effectuer la sortie");
            }
            stock.setQuantite(stock.getQuantite() - mouvementStock.getQuantite());
        }

        stockRepository.save(stock);
        mouvementStock.setStock(stock);
        return repository.save(mouvementStock);
    }

    public MouvementStock update(Long id, MouvementStock mvt) {
        MouvementStock mouvementStock = findById(id);
        mouvementStock.setTypeMouvement(mvt.getTypeMouvement());
        mouvementStock.setQuantite(mvt.getQuantite());
        mouvementStock.setDateMouvement(mvt.getDateMouvement());
        mouvementStock.setDestination(mvt.getDestination());
        return repository.save(mouvementStock);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}