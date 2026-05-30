package com.patris.controller;

import com.patris.model.SystemConfiguration;
import com.patris.repository.SystemConfigurationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Year;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/system-settings")
@RequiredArgsConstructor
public class SystemSettingsController {

    private static final Map<String, String> DEFAULT_VALUES = new LinkedHashMap<>();
    private static final Map<String, String> DESCRIPTIONS = new LinkedHashMap<>();

    static {
        DEFAULT_VALUES.put("IUP_PREFIX", "CT-LME");
        DEFAULT_VALUES.put("REFERENCE_YEAR", String.valueOf(Year.now().getValue()));
        DEFAULT_VALUES.put("AMORTISSEMENT_MODE", "LINEAIRE_01");
        DEFAULT_VALUES.put("EXPORT_EXERCICE", String.valueOf(Year.now().getValue()));
        DEFAULT_VALUES.put("EXPORT_INSTITUTION", "MINISTERE DE L'ECONOMIE ET DES FINANCES");
        DEFAULT_VALUES.put("EXPORT_POSTE", "CENTRAL DE LAME");

        DESCRIPTIONS.put("IUP_PREFIX", "Prefixe utilise pour la generation des IUP");
        DESCRIPTIONS.put("REFERENCE_YEAR", "Annee de reference du noyau patrimoine");
        DESCRIPTIONS.put("AMORTISSEMENT_MODE", "Mode standard applique aux nouveaux biens");
        DESCRIPTIONS.put("EXPORT_EXERCICE", "Exercice budgetaire utilise par defaut dans les exports");
        DESCRIPTIONS.put("EXPORT_INSTITUTION", "Institution ou ministere utilise par defaut dans les exports");
        DESCRIPTIONS.put("EXPORT_POSTE", "Poste comptable utilise par defaut dans les exports");
    }

    private final SystemConfigurationRepository configurationRepository;

    @GetMapping
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM') or hasAuthority('VIEW_DASHBOARD')")
    public Map<String, String> getSettings() {
        Map<String, String> settings = new LinkedHashMap<>(DEFAULT_VALUES);
        configurationRepository.findAll().forEach(configuration -> {
            if (DEFAULT_VALUES.containsKey(configuration.getConfigKey())) {
                settings.put(configuration.getConfigKey(), configuration.getConfigValue());
            }
        });
        return settings;
    }

    @PutMapping
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public Map<String, String> updateSettings(@RequestBody Map<String, String> payload) {
        payload.forEach((key, value) -> {
            if (!DEFAULT_VALUES.containsKey(key)) {
                return;
            }

            String normalizedValue = value == null || value.isBlank()
                ? DEFAULT_VALUES.get(key)
                : value.trim();

            SystemConfiguration configuration = configurationRepository
                .findByConfigKey(key)
                .orElseGet(SystemConfiguration::new);

            configuration.setConfigKey(key);
            configuration.setConfigValue(normalizedValue);
            configuration.setDescription(DESCRIPTIONS.get(key));
            configurationRepository.save(configuration);
        });

        return getSettings();
    }
}
