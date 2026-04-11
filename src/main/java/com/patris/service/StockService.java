package com.patris.service;

import com.patris.model.Consommable;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.repository.ConsommableRepository;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.StockRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class StockService {

    private final StockRepository repository;
    private final ConsommableRepository consommableRepository;
    private final MouvementStockRepository mouvementRepository;

    public StockService(StockRepository repository,
                        ConsommableRepository consommableRepository,
                        MouvementStockRepository mouvementRepository) {
        this.repository = repository;
        this.consommableRepository = consommableRepository;
        this.mouvementRepository = mouvementRepository;
    }

    public List<Stock> findAll() {
        return repository.findAll();
    }

    public Stock findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock introuvable"));
    }

    /**
     * Valide un mouvement de stock et met à jour les quantités réelles.
     * Pour les entrées, calcule également le nouveau PMP.
     */
    public void validerMouvement(Long mouvementId) {
        MouvementStock mouv = mouvementRepository.findById(mouvementId)
                .orElseThrow(() -> new RuntimeException("Mouvement introuvable"));

        if (mouv.isEstValide()) return; // Déjà validé

        Stock stock = mouv.getStock();
        Consommable article = stock.getConsommable();

        if (mouv.getTypeMouvement() == com.patris.enums.type_mouvement.ENTREE) {
            // Calcul du nouveau PMP
            double valeurActuelle = stock.getQuantite() * article.getPrixMoyenPondere();
            double valeurEntree = mouv.getQuantite() * (mouv.getPrixUnitaire() != null ? mouv.getPrixUnitaire() : article.getPrixMoyenPondere());
            int nouvelleQte = stock.getQuantite() + mouv.getQuantite();
            
            if (nouvelleQte > 0) {
                article.setPrixMoyenPondere((valeurActuelle + valeurEntree) / nouvelleQte);
            }
            
            stock.setQuantite(nouvelleQte);
            consommableRepository.save(article);
        } else if (mouv.getTypeMouvement() == com.patris.enums.type_mouvement.SORTIE) {
            if (stock.getQuantite() < mouv.getQuantite()) {
                throw new RuntimeException("Stock insuffisant pour cette sortie");
            }
            stock.setQuantite(stock.getQuantite() - mouv.getQuantite());
        }

        mouv.setEstValide(true);
        repository.save(stock);
        mouvementRepository.save(mouv);
    }

    public Stock save(Stock stock) {
        return repository.save(stock);
    }

    public Stock findByConsommableId(Long consommableId) {
        return repository.findAll().stream()
                .filter(s -> s.getConsommable() != null && s.getConsommable().getId().equals(consommableId))
                .findFirst()
                .orElse(null);
    }

    public Stock updateStock(Long id, Stock details) {
        Stock stock = findById(id);
        stock.setQuantite(details.getQuantite());
        stock.setSeuilAlerte(details.getSeuilAlerte());
        stock.setUnite(details.getUnite());
        stock.setPrixUnitaireMoyen(details.getPrixUnitaireMoyen());
        stock.setMagasin(details.getMagasin());
        return repository.save(stock);
    }

    public List<MouvementStock> findPendingMovements() {
        return mouvementRepository.findByEstValideFalse();
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
