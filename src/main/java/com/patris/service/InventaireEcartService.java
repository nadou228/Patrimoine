package com.patris.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.patris.enums.statutValidation;
import com.patris.model.InventaireEcart;
import com.patris.repository.InventaireEcartRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireEcartService {

    private final InventaireEcartRepository repository;

    public List<InventaireEcart> findAll() {
        return repository.findAll();
    }

    public List<InventaireEcart> findByCampagne(Long campagneId) {
        return repository.findByCampagneId(campagneId);
    }

    public InventaireEcart findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Ecart introuvable"));
    }

    public InventaireEcart create(InventaireEcart ecart) {
        if (ecart.getStatutValidation() == null) {
            ecart.setStatutValidation(statutValidation.EN_ATTENTE);
        }
        return repository.save(ecart);
    }

    public InventaireEcart update(Long id, InventaireEcart data) {
        InventaireEcart ecart = findById(id);
        ecart.setCampagne(data.getCampagne());
        ecart.setBien(data.getBien());
        ecart.setTypeEcart(data.getTypeEcart());
        ecart.setJustification(data.getJustification());
        ecart.setActionCorrective(data.getActionCorrective());
        ecart.setStatutValidation(data.getStatutValidation());
        return repository.save(ecart);
    }

    public InventaireEcart valider(Long id, statutValidation statut) {
        InventaireEcart ecart = findById(id);
        ecart.setStatutValidation(statut);
        ecart.setDecidePar(SecurityContextHolder.getContext().getAuthentication().getName());
        ecart.setDateDecision(LocalDateTime.now());
        return repository.save(ecart);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
