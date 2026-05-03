package com.patris.service;

import com.patris.model.Beneficiaire;
import com.patris.repository.BeneficiaireRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BeneficiaireService {

    private final BeneficiaireRepository repository;

    public List<Beneficiaire> findAll() {
        return repository.findAll();
    }

    public Beneficiaire findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bénéficiaire introuvable"));
    }

    public Beneficiaire save(Beneficiaire beneficiaire) {
        return repository.save(beneficiaire);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }

    public List<Beneficiaire> search(String query) {
        return repository.findByNomContainingIgnoreCaseOrPrenomContainingIgnoreCase(query, query);
    }
}
