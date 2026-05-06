package com.patris.service;

import com.patris.enums.type_mouvement;
import com.patris.event.BienCreatedFromStockEvent;
import com.patris.model.Bien;
import com.patris.model.MouvementStock;
import com.patris.model.Stock;
import com.patris.model.Beneficiaire;
import com.patris.repository.BeneficiaireRepository;
import com.patris.repository.BienRepository;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.StockRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MouvementStockService {

    private final MouvementStockRepository repository;
    private final StockRepository stockRepository;
    private final BienRepository bienRepository;
    private final BeneficiaireRepository beneficiaireRepository;
    private final com.patris.repository.MagasinRepository magasinRepository;

    public List<MouvementStock> findAll() {
        return repository.findAll();
    }

    public MouvementStock findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mouvement stock introuvable"));
    }

    @Transactional
    public MouvementStock save(MouvementStock mouvementStock) {
        if (mouvementStock.getStock() == null || mouvementStock.getStock().getId() == null) {
            throw new RuntimeException("Lien avec le stock manquant ou invalide");
        }

        Long stockId = mouvementStock.getStock().getId();
        Stock stock = stockRepository.findById(stockId)
                .orElseThrow(() -> new RuntimeException("Stock introuvable pour l'ID: " + stockId));

        if (mouvementStock.getTypeMouvement() == type_mouvement.SORTIE && stock.getQuantite() < mouvementStock.getQuantite()) {
            throw new RuntimeException("Stock insuffisant (disponible: " + stock.getQuantite() + ", demandé: " + mouvementStock.getQuantite() + ")");
        }

        // Vérification de la traçabilité pour les sorties
        if (mouvementStock.getTypeMouvement() == type_mouvement.SORTIE) {
            boolean hasEntityBeneficiaire = mouvementStock.getBeneficiaire() != null;
            boolean hasManualBeneficiaire = mouvementStock.getDestination() != null && mouvementStock.getDestination().contains("Bénéficiaire manuel");
            
            if (!hasEntityBeneficiaire && !hasManualBeneficiaire) {
                throw new com.patris.exception.BusinessException("Le bénéficiaire est obligatoire pour toute sortie de stock (sélectionnez-en un ou saisissez-le manuellement)");
            }
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
        mouvementStock.setBeneficiaire(mvt.getBeneficiaire());
        mouvementStock.setMagasin(mvt.getMagasin());

        type_mouvement effectiveType = mouvementStock.getTypeMouvement();
        if (effectiveType == type_mouvement.SORTIE && mouvementStock.getBeneficiaire() == null) {
            throw new RuntimeException("Un bénéficiaire est obligatoire pour une sortie de stock");
        }

        return repository.save(mouvementStock);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    @EventListener
    @Transactional
    public void handleBienCreatedFromStock(BienCreatedFromStockEvent event) {
        Stock stock = stockRepository.findById(event.getStockId())
                .orElseThrow(() -> new RuntimeException("Stock introuvable"));
        
        if (stock.getQuantite() < event.getQuantite()) {
            throw new RuntimeException("Stock insuffisant pour transformer en bien");
        }
        
        // Récupérer la référence du bien
        Bien bien = bienRepository.findById(event.getBienId())
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
        
        Beneficiaire beneficiaire = beneficiaireRepository.findById(event.getBeneficiaireId())
                .orElseThrow(() -> new RuntimeException("Bénéficiaire introuvable pour la sortie de stock"));

        MouvementStock mvt = new MouvementStock();
        mvt.setStock(stock);
        mvt.setTypeMouvement(type_mouvement.SORTIE);
        mvt.setQuantite(event.getQuantite());
        mvt.setDateMouvement(LocalDateTime.now());
        mvt.setReferencePiece("TRANSFORMATION_BIEN_" + (bien.getIup() != null ? bien.getIup() : bien.getId()));
        mvt.setBienCree(bien);
        mvt.setBeneficiaire(beneficiaire);
        mvt.setEstValide(true); // Sortie automatique validée car provient d'une immobilisation
        
        repository.save(mvt);
        
        // Mettre à jour la quantité en stock
        stock.setQuantite(stock.getQuantite() - event.getQuantite());
        stockRepository.save(stock);
    }

    /**
     * Effectue un transfert de stock entre deux magasins.
     * Réalise une SORTIE du source et une ENTREE dans la destination de manière atomique.
     */
    @Transactional
    public void transferer(Long stockSourceId, Long magasinDestId, int quantite, String motif) {
        Stock source = stockRepository.findById(stockSourceId)
                .orElseThrow(() -> new RuntimeException("Stock source introuvable"));
        
        com.patris.model.Magasin destMag = magasinRepository.findById(magasinDestId)
                .orElseThrow(() -> new RuntimeException("Magasin destination introuvable"));

        if (source.getQuantite() < quantite) {
            throw new RuntimeException("Stock insuffisant pour le transfert (disponible: " + source.getQuantite() + ")");
        }

        // 1. Sortie du magasin source
        MouvementStock sortie = new MouvementStock();
        sortie.setStock(source);
        sortie.setMagasin(source.getMagasin());
        sortie.setTypeMouvement(type_mouvement.SORTIE);
        sortie.setQuantite(quantite);
        sortie.setDateMouvement(LocalDateTime.now());
        sortie.setReferencePiece("TRF-OUT-" + System.currentTimeMillis());
        sortie.setDestination("Magasin: " + destMag.getNom());
        sortie.setEstValide(true);
        repository.save(sortie);
        
        source.setQuantite(source.getQuantite() - quantite);
        stockRepository.save(source);

        // 2. Entrée dans le magasin destination
        Stock dest = stockRepository.findByConsommableIdAndMagasinId(source.getConsommable().getId(), magasinDestId)
                .orElseGet(() -> {
                    Stock s = new Stock();
                    s.setConsommable(source.getConsommable());
                    s.setMagasin(destMag);
                    s.setQuantite(0);
                    return stockRepository.save(s);
                });
        
        MouvementStock entree = new MouvementStock();
        entree.setStock(dest);
        entree.setMagasin(destMag);
        entree.setTypeMouvement(type_mouvement.ENTREE);
        entree.setQuantite(quantite);
        entree.setDateMouvement(LocalDateTime.now());
        entree.setReferencePiece("TRF-IN-" + System.currentTimeMillis());
        entree.setFournisseur("Transfert de: " + source.getMagasin().getNom());
        entree.setEstValide(true);
        repository.save(entree);

        dest.setQuantite(dest.getQuantite() + quantite);
        stockRepository.save(dest);
    }
}
