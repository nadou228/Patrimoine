package com.patris.service;

import com.patris.model.Consommable;
import com.patris.model.Stock;
import com.patris.repository.ConsommableRepository;
import com.patris.repository.StockRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class StockService {

    private final StockRepository repository;
    private final ConsommableRepository consommableRepository;

    public StockService(StockRepository repository,
                        ConsommableRepository consommableRepository) {
        this.repository = repository;
        this.consommableRepository = consommableRepository;
    }

    public List<Stock> findAll() {
        return repository.findAll();
    }

    public Stock findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stock introuvable"));
    }

    public Stock save(Stock stock) {
        // RÃ©solution du consommable depuis la base
        if (stock.getConsommable() != null && stock.getConsommable().getId() != null) {
            Consommable consommable = consommableRepository.findById(stock.getConsommable().getId())
                    .orElseThrow(() -> new RuntimeException("Consommable introuvable"));
            stock.setConsommable(consommable);
        }
        return repository.save(stock);
    }

    public Stock updateStock(Long id, Stock s) {
        Stock stock = findById(id);
        stock.setQuantite(s.getQuantite());
        stock.setSeuilAlerte(s.getSeuilAlerte());
        stock.setUnite(s.getUnite());

        // Mise Ã  jour du consommable si fourni
        if (s.getConsommable() != null && s.getConsommable().getId() != null) {
            Consommable consommable = consommableRepository.findById(s.getConsommable().getId())
                    .orElseThrow(() -> new RuntimeException("Consommable introuvable"));
            stock.setConsommable(consommable);
        }

        return repository.save(stock);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public Stock findByConsommableId(Long consommableId) {
        return repository.findByConsommableId(consommableId);
    }
}
