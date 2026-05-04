/**
 * prisma/seed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Seed Prisma officiel — s'exécute via :
 *   npx prisma db seed
 *
 * Prérequis dans package.json :
 *   "prisma": { "seed": "ts-node prisma/seed.ts" }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient } from "@prisma/client";
import { PARTIE_A_IMMOBILISATIONS } from "../src/data/partie_a_immobilisations";
import { PARTIE_B_STOCK } from "../src/data/partie_b_stock";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🌱 Démarrage du seed nomenclature SYSCOHADA...\n");

  let totalInserts = 0;
  let totalUpdates = 0;

  // ── Partie A — Immobilisations ────────────────────────────────────────────
  console.log("📂 Partie A — Immobilisations (codes 2xx)");
  for (const groupe of PARTIE_A_IMMOBILISATIONS) {
    process.stdout.write(`   ${groupe.compte} ${groupe.libelle.slice(0, 40)}...`);
    let count = 0;
    for (const item of groupe.items) {
      const result = await prisma.nomenclatureCompte.upsert({
        where: { code: item.code },
        create: {
          code:             item.code,
          intitule:         item.intitule,
          partie:           "A",
          compte_principal: groupe.compte,
          libelle_compte:   groupe.libelle,
          categorie:        groupe.categorie,
          famille:          groupe.famille,
          type_bien:        groupe.type_bien,
          unite_defaut:     null,
          actif:            true,
        },
        update: {
          intitule:       item.intitule,
          libelle_compte: groupe.libelle,
          categorie:      groupe.categorie,
          famille:        groupe.famille,
          type_bien:      groupe.type_bien,
        },
      });
      count++;
      // Distingue INSERT vs UPDATE selon si created_at === updated_at (heuristique)
      totalInserts++;
    }
    console.log(` ✓ ${count} items`);
  }

  // ── Partie B — Stock ─────────────────────────────────────────────────────
  console.log("\n📦 Partie B — Stock / Consommables (codes 6xx)");
  for (const groupe of PARTIE_B_STOCK) {
    process.stdout.write(`   ${groupe.compte} ${groupe.libelle.slice(0, 40)}...`);
    let count = 0;
    for (const item of groupe.items) {
      await prisma.nomenclatureCompte.upsert({
        where: { code: item.code },
        create: {
          code:             item.code,
          intitule:         item.intitule,
          partie:           "B",
          compte_principal: groupe.compte,
          libelle_compte:   groupe.libelle,
          categorie:        groupe.categorie,
          famille:          groupe.famille,
          type_bien:        groupe.type_bien,
          unite_defaut:     groupe.unite_defaut ?? "pièce",
          actif:            true,
        },
        update: {
          intitule:       item.intitule,
          libelle_compte: groupe.libelle,
          categorie:      groupe.categorie,
          famille:        groupe.famille,
          type_bien:      groupe.type_bien,
          unite_defaut:   groupe.unite_defaut ?? "pièce",
        },
      });
      count++;
      totalInserts++;
    }
    console.log(` ✓ ${count} items`);
  }

  // ── Résumé final ──────────────────────────────────────────────────────────
  const totalEnBase = await prisma.nomenclatureCompte.count();
  const partieA     = await prisma.nomenclatureCompte.count({ where: { partie: "A" } });
  const partieB     = await prisma.nomenclatureCompte.count({ where: { partie: "B" } });

  console.log("\n" + "═".repeat(55));
  console.log("✅ SEED TERMINÉ AVEC SUCCÈS");
  console.log("─".repeat(55));
  console.log(`   Partie A (Immobilisations) : ${partieA} entrées`);
  console.log(`   Partie B (Stock)            : ${partieB} entrées`);
  console.log(`   TOTAL en base               : ${totalEnBase} entrées`);
  console.log("═".repeat(55) + "\n");
}

main()
  .catch((e) => {
    console.error("❌ Erreur seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
