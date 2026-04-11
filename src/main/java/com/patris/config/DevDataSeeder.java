package com.patris.config;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import com.patris.audit.AuditLog;
import com.patris.audit.AuditLogRepository;
import com.patris.enums.categorie;
import com.patris.enums.inventaireStatut;
import com.patris.enums.statut;
import com.patris.enums.statutValidation;
import com.patris.enums.typeDocument;
import com.patris.enums.typeEcartInventaire;
import com.patris.enums.type_mouvement;
import com.patris.model.Affectation;
import com.patris.model.Bail;
import com.patris.model.Bien;
import com.patris.model.Commune;
import com.patris.model.Consommable;
import com.patris.model.Document;
import com.patris.model.Entretien;
import com.patris.model.Immobilier;
import com.patris.model.InventaireCampagne;
import com.patris.model.InventaireEcart;
import com.patris.model.InventaireFiche;
import com.patris.model.MaterielRoulant;
import com.patris.model.Mobilier;
import com.patris.model.Mouvement;
import com.patris.model.MouvementStock;
import com.patris.model.Prefecture;
import com.patris.model.Region;
import com.patris.model.Reforme;
import com.patris.model.Services;
import com.patris.model.Sinistre;
import com.patris.model.Stock;
import com.patris.repository.AffectationRepository;
import com.patris.repository.BailRepository;
import com.patris.repository.BienRepository;
import com.patris.repository.CommuneRepository;
import com.patris.repository.ConsommableRepository;
import com.patris.repository.DocumentRepository;
import com.patris.repository.EntretienRepository;
import com.patris.repository.ImmobilierRepository;
import com.patris.repository.InventaireCampagneRepository;
import com.patris.repository.InventaireEcartRepository;
import com.patris.repository.InventaireFicheRepository;
import com.patris.repository.MaterielRoulantRepository;
import com.patris.repository.MobilierRepository;
import com.patris.repository.MouvementRepository;
import com.patris.repository.MouvementStockRepository;
import com.patris.repository.PrefectureRepository;
import com.patris.repository.RegionRepository;
import com.patris.repository.ReformeRepository;
import com.patris.repository.ServicesRepository;
import com.patris.repository.SinistreRepository;
import com.patris.repository.StockRepository;

@Configuration
@Profile("h2")
public class DevDataSeeder {

    @Bean
    public CommandLineRunner seedData(
        RegionRepository regionRepository,
        PrefectureRepository prefectureRepository,
        CommuneRepository communeRepository,
        ServicesRepository servicesRepository,
        BienRepository bienRepository,
        ImmobilierRepository immobilierRepository,
        MobilierRepository mobilierRepository,
        MaterielRoulantRepository materielRoulantRepository,
        AffectationRepository affectationRepository,
        EntretienRepository entretienRepository,
        BailRepository bailRepository,
        SinistreRepository sinistreRepository,
        DocumentRepository documentRepository,
        ConsommableRepository consommableRepository,
        StockRepository stockRepository,
        MouvementStockRepository mouvementStockRepository,
        MouvementRepository mouvementRepository,
        InventaireCampagneRepository inventaireCampagneRepository,
        InventaireFicheRepository inventaireFicheRepository,
        InventaireEcartRepository inventaireEcartRepository,
        ReformeRepository reformeRepository,
        AuditLogRepository auditLogRepository
    ) {
        return args -> {
            if (bienRepository.count() > 0) {
                return;
            }

            Region region = regionRepository.save(Region.builder().nomRegion("Maritime").build());
            Prefecture pref = prefectureRepository.save(new Prefecture(null, "Golfe", region));
            Commune commune = communeRepository.save(new Commune(null, "LomÃ©", pref));

            Services serviceInfo = servicesRepository.save(new Services(null, "Service Informatique", region));
            Services serviceFin = servicesRepository.save(new Services(null, "Service Financier", region));
            Services serviceTech = servicesRepository.save(new Services(null, "Service Technique", region));

            Bien bienMobilier = Bien.builder()
                .codeBien("MOB-001")
                .iup("CT-LME-MOB-2026-000001")
                .designation("Bureau en bois massif")
                .categorie(categorie.MOBILIER)
                .dateAcquisition(LocalDate.now().minusYears(2))
                .valeur(150_000)
                .etat("BON")
                .localisation("Mairie Centrale")
                .observation("Bon Ã©tat gÃ©nÃ©ral")
                .dureeAmortissement(5)
                .statutValidation(statutValidation.VALIDE)
                .build();
            bienRepository.save(bienMobilier);

            Mobilier mobilier = new Mobilier();
            mobilier.setNumeroSerie("SN-BOIS-334");
            mobilier.setCodeQr("QR-MOB-001");
            mobilier.setServiceAffectation("Administration");
            mobilier.setBien(bienMobilier);
            mobilierRepository.save(mobilier);

            Bien bienImmobilier = Bien.builder()
                .codeBien("IMM-002")
                .iup("CT-LME-IMM-2026-000002")
                .designation("BÃ¢timent administratif annexe")
                .categorie(categorie.IMMOBILIER)
                .dateAcquisition(LocalDate.now().minusYears(5))
                .valeur(120_000_000)
                .etat("BON")
                .localisation("Annexe Nord")
                .observation("BÃ¢timent sÃ©curisÃ©")
                .dureeAmortissement(20)
                .statutValidation(statutValidation.VALIDE)
                .build();
            bienRepository.save(bienImmobilier);

            Immobilier immobilier = Immobilier.builder()
                .adresse("Annexe Nord - LomÃ©")
                .usage("Administratif")
                .superficie(350.5)
                .statutFoncier("Titre foncier")
                .coordonneeGps("6.1745, 1.2314")
                .bien(bienImmobilier)
                .build();
            immobilierRepository.save(immobilier);

            Bien bienVehicule = Bien.builder()
                .codeBien("VEH-003")
                .iup("CT-LME-VEH-2026-000003")
                .designation("Pick-up Toyota Hilux")
                .categorie(categorie.MATERIEL_ROULANT)
                .dateAcquisition(LocalDate.now().minusYears(3))
                .valeur(25_000_000)
                .etat("MOYEN")
                .localisation("Garage central")
                .observation("KilomÃ©trage Ã©levÃ©")
                .dureeAmortissement(7)
                .statutValidation(statutValidation.VALIDE)
                .build();
            bienRepository.save(bienVehicule);

            MaterielRoulant roulant = new MaterielRoulant();
            roulant.setImmatriculation("TG-1234-AA");
            roulant.setMarque("Toyota");
            roulant.setModele("Hilux");
            roulant.setCarburant("Diesel");
            roulant.setKilometrage(142_000);
            roulant.setDateAssurance(LocalDateTime.now().minusMonths(2));
            roulant.setDateFinAssurance(LocalDateTime.now().plusMonths(10));
            roulant.setDateVisiteTechnique(LocalDateTime.now().minusMonths(8));
            roulant.setNumeroAssurance("ASS-99812");
            roulant.setConsommationMoyenne(8.4);
            roulant.setBien(bienVehicule);
            materielRoulantRepository.save(roulant);

            Affectation aff = Affectation.builder()
                .beneficaire("Kossi Mensah")
                .fonction("Chef de service")
                .dateAffectation(LocalDateTime.now().minusMonths(6))
                .bien(bienMobilier)
                .services(serviceInfo)
                .build();
            affectationRepository.save(aff);

            Entretien entretien = new Entretien(null, LocalDate.now().plusDays(10), null, 75_000.0, "Garage Auto Togo", "Maintenance prÃ©ventive", bienVehicule);
            entretienRepository.save(entretien);

            Bail bail = new Bail(null, "SociÃ©tÃ© Immo", 450_000.0, LocalDateTime.now().minusMonths(3), LocalDateTime.now().plusMonths(9), statut.ACTIF, bienImmobilier);
            bailRepository.save(bail);

            Sinistre sinistre = new Sinistre(null, LocalDate.now().minusMonths(4).toString(), "Incendie", 2_500_000.0, 0.0, "Dégâts légers", null, null, null, com.patris.enums.statutSinistre.DECLARÉ, bienImmobilier);
            sinistreRepository.save(sinistre);

            Document doc = new Document(null, "facture_bureau.pdf", typeDocument.FACTURES, LocalDateTime.now().minusYears(2), "/docs/facture_bureau.pdf", bienMobilier, null);
            documentRepository.save(doc);

            Consommable consommable = new Consommable();
            consommable.setNomProduit("Cartouches d'encre");
            consommable.setSeuilAlerte(20);
            consommable.setUnite("Boîte");
            consommable.setServiceAffiche("Magasin Central");
            consommable.setCommune(commune);
            consommableRepository.save(consommable);

            Stock stock = new Stock(null, 150, 30, "Boîte", 1000.0, consommable, null);
            stockRepository.save(stock);

            MouvementStock mvStock = new MouvementStock();
            mvStock.setTypeMouvement(type_mouvement.ENTREE);
            mvStock.setQuantite(50);
            mvStock.setDateMouvement(LocalDateTime.now().minusDays(2));
            mvStock.setReferencePiece("BL-2026-001");
            mvStock.setStock(stock);
            mouvementStockRepository.save(mvStock);

            Mouvement mv = new Mouvement();
            mv.setType(type_mouvement.TRANSFERT);
            mv.setDateCreation(LocalDateTime.now().minusDays(3));
            mv.setObservation("Transfert vers service financier");
            mv.setServiceSource(serviceInfo);
            mv.setServiceDestination(serviceFin);
            mv.setBien(bienMobilier);
            mouvementRepository.save(mv);

            InventaireCampagne campagne = new InventaireCampagne();
            campagne.setNom("Inventaire annuel 2026");
            campagne.setSites("Mairie Centrale, Annexe Nord");
            campagne.setEquipes("Equipe A, Equipe B");
            campagne.setDateDebut(LocalDate.now().minusDays(15));
            campagne.setDateFin(LocalDate.now().plusDays(15));
            campagne.setStatut(inventaireStatut.EN_COURS);
            campagne.setCreePar("akim");
            campagne.setDateCreation(LocalDateTime.now().minusDays(20));
            inventaireCampagneRepository.save(campagne);

            InventaireFiche fiche = new InventaireFiche();
            fiche.setCampagne(campagne);
            fiche.setBien(bienMobilier);
            fiche.setCodeIup(bienMobilier.getIup());
            fiche.setEtatConstate("BON");
            fiche.setLocalisationReelle("Mairie Centrale");
            fiche.setObservation("Conforme");
            fiche.setAnomalie(false);
            fiche.setValidationAgent(statutValidation.VALIDE);
            fiche.setValidationSuperviseur(statutValidation.EN_ATTENTE);
            fiche.setAgentUsername("akim");
            fiche.setDateScan(LocalDateTime.now().minusDays(1));
            inventaireFicheRepository.save(fiche);

            InventaireEcart ecart = new InventaireEcart();
            ecart.setCampagne(campagne);
            ecart.setBien(bienVehicule);
            ecart.setTypeEcart(typeEcartInventaire.MAUVAISE_AFFECTATION);
            ecart.setJustification("VÃ©hicule localisÃ© au garage central");
            ecart.setActionCorrective("Mise Ã  jour affectation");
            ecart.setStatutValidation(statutValidation.EN_ATTENTE);
            inventaireEcartRepository.save(ecart);

            Reforme reforme = new Reforme();
            reforme.setBien(bienVehicule.getDesignation());
            reforme.setTypeReforme("REBUT");
            reforme.setMotif("Obsolescence");
            reforme.setRapportTechniqueUrl("/docs/rapport_hilux.pdf");
            reforme.setValeurResiduelle(1_000_000.0);
            reforme.setDecision("Mise au rebut");
            reforme.setDateReforme(LocalDate.now().plusDays(30));
            reforme.setStatut("EN_COURS");
            reformeRepository.save(reforme);

            List<AuditLog> logs = List.of(
                new AuditLog(null, "CREATE", "Bien", bienMobilier.getId(), "akim", LocalDateTime.now().minusDays(2)),
                new AuditLog(null, "UPDATE", "Stock", stock.getId(), "akim", LocalDateTime.now().minusDays(1))
            );
            auditLogRepository.saveAll(logs);
        };
    }
}
