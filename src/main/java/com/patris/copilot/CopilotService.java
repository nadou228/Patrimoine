package com.patris.copilot;

import com.patris.dto.DashboardStatsDTO;
import com.patris.model.Bien;
import com.patris.model.BienMaterielRoulant;
import com.patris.model.BienMobilier;
import com.patris.model.Stock;
import com.patris.repository.BienRepository;
import com.patris.repository.EntretienRepository;
import com.patris.repository.ReformeRepository;
import com.patris.repository.StockRepository;
import com.patris.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CopilotService {

    private final BienRepository bienRepository;
    private final EntretienRepository entretienRepository;
    private final StockRepository stockRepository;
    private final ReformeRepository reformeRepository;
    private final DashboardService dashboardService;

    public CopilotResponse processQuery(String question) {
        String q = normalize(question);

        if (matches(q, "bonjour", "bonsoir", "salut", "hello", "coucou", "salam")) return handleGreeting();
        if (matches(q, "aide", "help", "que peux", "que sais", "quoi faire")) return handleWelcome();
        if (matches(q, "diagnostic", "executif", "synthese", "analyse globale", "etat global", "bcg", "consulting", "cabinet")) return handleExecutiveDiagnosis();
        if (matches(q, "scenario", "prevision", "predict", "projection", "90 jours", "30 jours", "anticip")) return handlePredictiveScenario();
        if (matches(q, "budget", "capex", "opex", "renouvellement", "investissement", "plan 3 ans")) return handleBudgetArbitrage();
        if (matches(q, "reform", "rebut", "eliminer")) return handleReformes();
        if (matches(q, "maintenance", "entretien", "revision", "panne")) return handleMaintenance();
        if (matches(q, "vetust", "age", "vieux", "ancien", "use")) return handleVetuste();
        if (matches(q, "stock", "consommable", "rupture", "penurie")) return handleStocks();
        if (matches(q, "non affecte", "sans affectation", "disponible", "libre", "non assigne")) return handleNonAffectes();
        if (matches(q, "sinistre", "accident", "vol", "degat", "incendie")) return handleSinistres();
        if (matches(q, "valeur", "patrimoine", "total", "bilan", "richesse")) return handleValeur();
        if (matches(q, "categorie", "repartition", "distribution", "immobilier", "mobilier", "vehicule")) return handleCategories();
        if (matches(q, "sante", "score", "indice", "etat general")) return handleSanteParc();
        if (matches(q, "recommandation", "conseil", "action", "priorite", "que faire")) return handleRecommandations();
        if (matches(q, "inventaire", "recensement", "campagne")) return handleInventaire();

        return handleFallback(question);
    }

    private CopilotResponse handleGreeting() {
        return new CopilotResponse(
            "Bonjour, je suis prêt. Je peux raisonner comme un analyste patrimonial : diagnostic exécutif, risques à 90 jours, budget de renouvellement, stocks critiques, maintenance, réforme et plan d'action. Sur quoi voulez-vous qu'on se concentre ?",
            "INFO",
            List.of(
                item("Diagnostic exécutif", "Fais-moi un diagnostic exécutif du patrimoine", "info"),
                item("Scénario 90 jours", "Quels risques dans les 90 prochains jours ?", "warning"),
                item("Plan d'action", "Quelles actions dois-je prioriser ?", "success"),
                item("Budget & arbitrage", "Quel plan de renouvellement recommandes-tu ?", "info")
            ),
            "Fais-moi un diagnostic exécutif du patrimoine"
        );
    }

    private CopilotResponse handleExecutiveDiagnosis() {
        List<Bien> biens = biens();
        List<Stock> stocks = stockRepository.findAll();
        if (biens.isEmpty()) {
            return new CopilotResponse("Je n'ai pas encore assez de données pour établir un diagnostic fiable. Ajoutez les biens, valeurs, dates d'acquisition, affectations et maintenances.", "INFO", List.of(), null);
        }

        double valeurBrute = biens.stream().mapToDouble(Bien::getValeur).sum();
        double valeurNette = biens.stream().mapToDouble(b -> b.getValeurNetteComptable() != null ? b.getValeurNetteComptable() : b.getValeur()).sum();
        double vetuste = biens.stream().mapToDouble(this::vetustePercent).average().orElse(0);
        long critiques = biens.stream().filter(b -> riskScore(b) >= 60).count();
        long reformes = biens.stream().filter(b -> vetustePercent(b) >= 80).count();
        long nonAffectes = biens.stream().filter(this::isNotAssigned).count();
        long stocksAlerte = stocks.stream().filter(this::isStockInAlert).count();
        int maturite = Math.max(0, (int) Math.round(100 - vetuste * 0.35 - critiques * 4 - nonAffectes * 1.5 - stocksAlerte * 3));

        String posture = maturite >= 75
            ? "Le parc est globalement maîtrisé. Le levier principal est l'optimisation préventive."
            : maturite >= 50
                ? "Le parc est pilotable, mais plusieurs signaux faibles demandent un plan d'action structuré."
                : "Le parc présente une exposition élevée. Il faut prioriser risques, réformes et continuité opérationnelle.";

        return new CopilotResponse(
            "Diagnostic exécutif PATRIS : " + posture + " Lecture type cabinet conseil : protéger les actifs critiques, réduire le capital dormant, lisser les remplacements et sécuriser les consommables critiques.",
            "RAPPORT",
            List.of(
                item("Maturité patrimoniale", maturite + "/100", maturite >= 75 ? "success" : maturite >= 50 ? "warning" : "danger"),
                item("Valeur nette / brute", money(valeurNette) + " / " + money(valeurBrute), "info"),
                item("Vétusté moyenne", Math.round(vetuste) + "%", vetuste >= 65 ? "danger" : vetuste >= 45 ? "warning" : "success"),
                item("Actifs critiques", critiques + " bien(s)", critiques > 0 ? "warning" : "success"),
                item("Réforme potentielle", reformes + " bien(s)", reformes > 0 ? "danger" : "success"),
                item("Capital dormant", nonAffectes + " bien(s) sans affectation", nonAffectes > 0 ? "info" : "success"),
                item("Stocks en tension", stocksAlerte + " référence(s)", stocksAlerte > 0 ? "warning" : "success")
            ),
            "Quels risques dans les 90 prochains jours ?"
        );
    }

    private CopilotResponse handlePredictiveScenario() {
        List<Bien> biens = biens();
        LocalDate now = LocalDate.now();
        long maintenance30 = biens.stream().filter(b -> dueWithin(b, now, 30)).count();
        long maintenance90 = biens.stream().filter(b -> {
            LocalDate date = resolveNextControlDate(b);
            return date != null && date.isAfter(now.plusDays(30)) && !date.isAfter(now.plusDays(90));
        }).count();
        long reforme12Mois = biens.stream().filter(b -> vetustePercent(b) >= 70).count();
        long nonAffectes = biens.stream().filter(this::isNotAssigned).count();
        long critiques = biens.stream().filter(b -> riskScore(b) >= 60).count();

        return new CopilotResponse(
            "Scénario prédictif : à court terme, surveillez surtout les échéances de maintenance, les biens très vétustes et les actifs non affectés. À 90 jours, l'objectif est de transformer les alertes en calendrier d'action budgété.",
            "RAPPORT",
            List.of(
                item("0-30 jours", maintenance30 + " contrôle(s) ou maintenance(s)", maintenance30 > 0 ? "danger" : "success"),
                item("31-90 jours", maintenance90 + " échéance(s) à planifier", maintenance90 > 0 ? "warning" : "success"),
                item("Risque 12 mois", reforme12Mois + " bien(s) proches d'un arbitrage", reforme12Mois > 0 ? "warning" : "success"),
                item("Capital dormant", nonAffectes + " bien(s) sans affectation", nonAffectes > 0 ? "info" : "success"),
                item("Exposition critique", critiques + " bien(s) à risque élevé", critiques > 0 ? "danger" : "success")
            ),
            "Quel plan de renouvellement recommandes-tu ?"
        );
    }

    private CopilotResponse handleBudgetArbitrage() {
        List<Bien> biens = biens();
        double base = biens.stream()
            .filter(b -> vetustePercent(b) >= 80 || riskScore(b) >= 60)
            .mapToDouble(Bien::getValeur)
            .sum();

        return new CopilotResponse(
            "Arbitrage budgétaire recommandé : appliquez une matrice valeur × risque × criticité service. Ne remplacez pas tout : financez d'abord les actifs dont la panne bloque l'activité, puis lissez le renouvellement sur 12 à 36 mois.",
            "RECOMMANDATION",
            List.of(
                item("Phase urgence", money(base * 0.35) + " pour actifs critiques", "danger"),
                item("Phase 12 mois", money(base * 0.45) + " pour renouvellement ciblé", "warning"),
                item("Réserve préventive", money(base * 0.08) + " pour maintenance", "info"),
                item("Méthode", "Prioriser impact service, risque, vétusté, valeur nette", "success")
            ),
            "Fais-moi un diagnostic exécutif du patrimoine"
        );
    }

    private CopilotResponse handleReformes() {
        List<CopilotResponse.CopilotItem> items = biens().stream()
            .filter(b -> vetustePercent(b) >= 80 || "SINISTRE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel())))
            .sorted(Comparator.comparingDouble(this::vetustePercent).reversed())
            .limit(8)
            .map(b -> item(labelBien(b), "Vétusté : " + Math.round(vetustePercent(b)) + "% | Statut : " + b.getStatutOperationnel(), vetustePercent(b) >= 95 ? "danger" : "warning"))
            .collect(Collectors.toList());
        if (items.isEmpty()) return new CopilotResponse("Aucun bien ne répond actuellement aux critères forts de réforme.", "INFO", List.of(), "Quel est l'indice de santé du parc ?");
        return new CopilotResponse("J'ai identifié " + items.size() + " bien(s) candidats à la réforme. Priorisez ceux qui combinent vétusté élevée, sinistre et impact service.", "RECOMMANDATION", items, "Quel plan de renouvellement recommandes-tu ?");
    }

    private CopilotResponse handleMaintenance() {
        LocalDate now = LocalDate.now();
        List<CopilotResponse.CopilotItem> items = biens().stream()
            .map(b -> new Object[]{ b, resolveNextControlDate(b) })
            .filter(arr -> arr[1] != null && !((LocalDate) arr[1]).isAfter(now.plusDays(30)))
            .sorted(Comparator.comparing(arr -> (LocalDate) arr[1]))
            .limit(8)
            .map(arr -> {
                Bien b = (Bien) arr[0];
                LocalDate date = (LocalDate) arr[1];
                boolean late = date.isBefore(now);
                return item(labelBien(b), late ? "En retard depuis " + Math.abs(ChronoUnit.DAYS.between(now, date)) + " jour(s)" : "Échéance dans " + ChronoUnit.DAYS.between(now, date) + " jour(s)", late ? "danger" : "warning");
            })
            .collect(Collectors.toList());
        if (items.isEmpty()) return new CopilotResponse("Aucune maintenance urgente dans les 30 prochains jours.", "INFO", List.of(), "Quels risques dans les 90 prochains jours ?");
        return new CopilotResponse(items.size() + " maintenance(s) ou contrôle(s) sont à traiter dans les 30 jours.", "ALERTE", items, "Quels risques dans les 90 prochains jours ?");
    }

    private CopilotResponse handleVetuste() {
        List<Bien> biens = biens();
        double taux = biens.stream().mapToDouble(this::vetustePercent).average().orElse(0);
        List<CopilotResponse.CopilotItem> items = biens.stream()
            .filter(b -> vetustePercent(b) >= 70)
            .sorted(Comparator.comparingDouble(this::vetustePercent).reversed())
            .limit(6)
            .map(b -> item(labelBien(b), "Vétusté : " + Math.round(vetustePercent(b)) + "%", vetustePercent(b) >= 90 ? "danger" : "warning"))
            .toList();
        return new CopilotResponse("Le taux de vétusté moyen du parc est de " + Math.round(taux) + "%. " + (taux > 60 ? "Le parc est vieillissant : un plan de renouvellement est recommandé." : "Le parc reste dans une zone acceptable."), "RAPPORT", items, "Quel plan de renouvellement recommandes-tu ?");
    }

    private CopilotResponse handleStocks() {
        List<CopilotResponse.CopilotItem> items = stockRepository.findAll().stream()
            .filter(this::isStockInAlert)
            .map(s -> {
                int seuil = threshold(s);
                boolean rupture = s.getQuantite() <= 0;
                String name = s.getConsommable() != null ? s.getConsommable().getNomProduit() : "Consommable";
                return item(name, "Stock : " + s.getQuantite() + "/" + seuil + " " + s.getUnite(), rupture ? "danger" : "warning");
            })
            .toList();
        if (items.isEmpty()) return new CopilotResponse("Tous les stocks de consommables sont au-dessus de leur seuil d'alerte.", "INFO", List.of(), "Fais-moi un diagnostic exécutif du patrimoine");
        return new CopilotResponse(items.size() + " consommable(s) sont en dessous du seuil. Un réapprovisionnement est recommandé.", "ALERTE", items, "Quelles actions dois-je prioriser ?");
    }

    private CopilotResponse handleNonAffectes() {
        List<Bien> biens = biens();
        List<CopilotResponse.CopilotItem> items = biens.stream()
            .filter(this::isNotAssigned)
            .limit(8)
            .map(b -> item(labelBien(b), "Valeur : " + money(b.getValeur()), "info"))
            .toList();
        return new CopilotResponse(items.size() + " bien(s) affichés ici ne sont pas affectés. Le total peut être supérieur : lancez une campagne d'affectation pour réduire le capital dormant.", "RECOMMANDATION", items, "Quelles actions dois-je prioriser ?");
    }

    private CopilotResponse handleSinistres() {
        List<CopilotResponse.CopilotItem> items = biens().stream()
            .filter(b -> "SINISTRE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel())))
            .map(b -> item(labelBien(b), "Valeur : " + money(b.getValeur()), "danger"))
            .toList();
        if (items.isEmpty()) return new CopilotResponse("Aucun bien sinistré actuellement.", "INFO", List.of(), "Quel est l'indice de santé du parc ?");
        return new CopilotResponse(items.size() + " bien(s) sinistré(s) nécessitent déclaration, suivi assurance et arbitrage réforme.", "ALERTE", items, "Quels biens sont candidats à la réforme ?");
    }

    private CopilotResponse handleValeur() {
        List<Bien> biens = biens();
        double brute = biens.stream().mapToDouble(Bien::getValeur).sum();
        double nette = biens.stream().mapToDouble(b -> b.getValeurNetteComptable() != null ? b.getValeurNetteComptable() : b.getValeur()).sum();
        return new CopilotResponse("Le patrimoine représente une valeur brute de " + money(brute) + " pour une valeur nette comptable de " + money(nette) + ".", "RAPPORT", List.of(
            item("Valeur brute", money(brute), "info"),
            item("Valeur nette", money(nette), "success"),
            item("Amortissement estimé", money(Math.max(0, brute - nette)), "warning"),
            item("Nombre de biens", String.valueOf(biens.size()), "info")
        ), "Quel est le taux de vétusté global du parc ?");
    }

    private CopilotResponse handleCategories() {
        List<CopilotResponse.CopilotItem> items = dashboardService.getRepartitionCategories().stream()
            .sorted(Comparator.comparingDouble(DashboardStatsDTO.CategoryDistributionDTO::count).reversed())
            .map(c -> item(c.name(), c.count() + " biens | " + money(c.value()), "info"))
            .toList();
        return new CopilotResponse("Voici la répartition du parc par catégorie, en volume et en valeur.", "RAPPORT", items, "Fais-moi un diagnostic exécutif du patrimoine");
    }

    private CopilotResponse handleSanteParc() {
        List<Bien> biens = biens();
        if (biens.isEmpty()) return new CopilotResponse("Le parc est vide, aucun score calculable.", "INFO", List.of(), null);
        double vetuste = biens.stream().mapToDouble(this::vetustePercent).average().orElse(0);
        long maintenance = biens.stream().filter(b -> "EN_MAINTENANCE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel()))).count();
        long nonAffectes = biens.stream().filter(this::isNotAssigned).count();
        long sinistres = biens.stream().filter(b -> "SINISTRE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel()))).count();
        int score = Math.max(0, (int) (100 - vetuste * 0.4 - maintenance * 5 - nonAffectes * 2 - sinistres * 10));
        return new CopilotResponse("Indice de santé du parc : " + score + "/100. Cet indice combine vétusté, maintenance, sinistres et affectation.", "RAPPORT", List.of(
            item("Score de santé", score + "/100", score >= 80 ? "success" : score >= 55 ? "warning" : "danger"),
            item("Vétusté moyenne", Math.round(vetuste) + "%", vetuste > 60 ? "danger" : "info"),
            item("En maintenance", maintenance + " bien(s)", maintenance > 0 ? "warning" : "success"),
            item("Sans affectation", nonAffectes + " bien(s)", nonAffectes > 0 ? "warning" : "success"),
            item("Sinistrés", sinistres + " bien(s)", sinistres > 0 ? "danger" : "success")
        ), "Quelles actions dois-je prioriser ?");
    }

    private CopilotResponse handleRecommandations() {
        List<CopilotResponse.CopilotItem> items = new ArrayList<>();
        long reformes = biens().stream().filter(b -> vetustePercent(b) >= 80).count();
        long maintenances = biens().stream().filter(b -> "EN_MAINTENANCE".equalsIgnoreCase(String.valueOf(b.getStatutOperationnel()))).count();
        long nonAffectes = biens().stream().filter(this::isNotAssigned).count();
        long stocks = stockRepository.findAll().stream().filter(this::isStockInAlert).count();
        if (reformes > 0) items.add(item("Lancer " + reformes + " procédure(s) de réforme", "Vétusté élevée ou risque critique", "danger"));
        if (maintenances > 0) items.add(item("Suivre " + maintenances + " maintenance(s)", "Réduire les immobilisations opérationnelles", "warning"));
        if (nonAffectes > 0) items.add(item("Affecter " + nonAffectes + " bien(s)", "Réduire le capital dormant", "info"));
        if (stocks > 0) items.add(item("Réapprovisionner " + stocks + " consommable(s)", "Prévenir les ruptures", "warning"));
        if (items.isEmpty()) return new CopilotResponse("Toutes les priorités sont sous contrôle. Aucune action urgente n'est requise.", "INFO", List.of(), "Fais-moi un diagnostic exécutif du patrimoine");
        return new CopilotResponse("Voici les actions prioritaires recommandées pour optimiser le patrimoine.", "RECOMMANDATION", items, "Quels risques dans les 90 prochains jours ?");
    }

    private CopilotResponse handleInventaire() {
        return new CopilotResponse("Le module Inventaire permet de créer des campagnes, recenser les biens sur le terrain, détecter les écarts et certifier les résultats.", "INFO", List.of(
            item("Créer une campagne", "Menu Inventaire → Préparation", "info"),
            item("Recenser terrain", "Mode Terrain / QR code", "info"),
            item("Traiter les écarts", "Comparer physique et comptabilité", "warning")
        ), "Fais-moi un diagnostic exécutif du patrimoine");
    }

    private CopilotResponse handleWelcome() {
        return new CopilotResponse("Je peux analyser le patrimoine en langage naturel. Demandez par exemple : diagnostic exécutif, risques à 90 jours, biens à réformer, stocks critiques, budget de renouvellement ou actions prioritaires.", "INFO", List.of(
            item("Diagnostic exécutif", "Fais-moi un diagnostic exécutif du patrimoine", "info"),
            item("Risques 90 jours", "Quels risques dans les 90 prochains jours ?", "warning"),
            item("Biens à réformer", "Quels biens sont candidats à la réforme ?", "danger"),
            item("Santé du parc", "Quel est l'indice de santé du parc ?", "success"),
            item("Plan d'action", "Quelles actions dois-je prioriser ?", "info")
        ), null);
    }

    private CopilotResponse handleFallback(String question) {
        return new CopilotResponse("Je n'ai pas bien compris : \"" + question + "\". Reformulez ou choisissez une analyse ci-dessous.", "INFO", List.of(
            item("Diagnostic", "Fais-moi un diagnostic exécutif du patrimoine", "info"),
            item("Prévision", "Quels risques dans les 90 prochains jours ?", "warning"),
            item("Maintenance", "Quels biens nécessitent une maintenance ?", "info"),
            item("Stocks", "Quels consommables sont en rupture ?", "warning")
        ), "Fais-moi un diagnostic exécutif du patrimoine");
    }

    private boolean matches(String question, String... keywords) {
        for (String keyword : keywords) {
            if (question.contains(normalize(keyword))) return true;
        }
        return false;
    }

    private String normalize(String value) {
        if (value == null) return "";
        String normalized = Normalizer.normalize(value.toLowerCase(Locale.ROOT).trim(), Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{M}", "");
    }

    private List<Bien> biens() {
        return bienRepository.findAllByArchivedFalse();
    }

    private CopilotResponse.CopilotItem item(String label, String value, String badge) {
        return new CopilotResponse.CopilotItem(label, value, badge);
    }

    private String money(double value) {
        return String.format(Locale.FRENCH, "%,.0f FCFA", value);
    }

    private String labelBien(Bien bien) {
        return (bien.getDesignation() != null ? bien.getDesignation() : "Bien") + (bien.getIup() != null ? " (" + bien.getIup() + ")" : "");
    }

    private double vetustePercent(Bien bien) {
        return bien.getValeur() > 0 && bien.getAmortissementCumule() != null
            ? Math.min(100, (bien.getAmortissementCumule() / bien.getValeur()) * 100.0)
            : 0;
    }

    private boolean isNotAssigned(Bien bien) {
        return bien.getService() == null || bien.getService().isBlank();
    }

    private boolean isStockInAlert(Stock stock) {
        return stock.getQuantite() <= threshold(stock);
    }

    private int threshold(Stock stock) {
        if (stock.getSeuilAlerte() > 0) return stock.getSeuilAlerte();
        return stock.getConsommable() != null ? stock.getConsommable().getSeuilAlerte() : 0;
    }

    private boolean dueWithin(Bien bien, LocalDate now, int days) {
        LocalDate date = resolveNextControlDate(bien);
        return date != null && !date.isAfter(now.plusDays(days));
    }

    private int riskScore(Bien bien) {
        int score = 0;
        double vetuste = vetustePercent(bien);
        if (vetuste >= 90) score += 40;
        else if (vetuste >= 70) score += 25;
        else if (vetuste >= 50) score += 10;
        if ("SINISTRE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))) score += 40;
        else if ("EN_MAINTENANCE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))) score += 20;
        else if ("HORS_SERVICE".equalsIgnoreCase(String.valueOf(bien.getStatutOperationnel()))) score += 30;
        LocalDate nextControl = resolveNextControlDate(bien);
        if (nextControl != null && nextControl.isBefore(LocalDate.now())) score += 25;
        else if (nextControl != null && nextControl.isBefore(LocalDate.now().plusDays(15))) score += 10;
        if (isNotAssigned(bien)) score += 10;
        return score;
    }

    private LocalDate resolveNextControlDate(Bien bien) {
        if (bien instanceof BienMobilier mobilier) return mobilier.getDateProchaineMaintenance();
        if (bien instanceof BienMaterielRoulant roulant) return roulant.getDateProchaineVisiteTechnique();
        return null;
    }
}
