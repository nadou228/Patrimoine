/**
 * routes/nomenclature.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * API REST pour la nomenclature SYSCOHADA
 *
 * Endpoints :
 *   GET  /api/v1/nomenclature/comptes           → liste des comptes principaux
 *   GET  /api/v1/nomenclature/categories        → catégories (filtrées par compte)
 *   GET  /api/v1/nomenclature/familles          → familles (filtrées par catégorie)
 *   GET  /api/v1/nomenclature/articles          → articles (filtrés par famille/compte)
 *   GET  /api/v1/nomenclature/search            → recherche full-text
 *   POST /api/v1/nomenclature/import            → import bulk (ADMIN)
 *   POST /api/v1/nomenclature                   → créer un code (ADMIN)
 *   PUT  /api/v1/nomenclature/:code             → modifier (ADMIN)
 *   DELETE /api/v1/nomenclature/:code           → archiver (ADMIN)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const router = Router();
const prisma = new PrismaClient();

// ─── Middleware auth (injecté depuis app.ts) ──────────────────────────────────
// authMiddleware et requireRole sont importés dans app.ts et appliqués globalement
// ou par route selon la configuration.

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/nomenclature/comptes
// Retourne les comptes principaux distincts (pour le 1er dropdown)
// Query : ?partie=A|B&type_bien=immobilisation|consommable|entretien
// ─────────────────────────────────────────────────────────────────────────────
router.get("/comptes", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { partie, type_bien } = req.query;

    const where: any = { actif: true };
    if (partie)    where.partie    = partie;
    if (type_bien) where.type_bien = type_bien;

    const comptes = await prisma.nomenclatureCompte.findMany({
      where,
      select: {
        compte_principal: true,
        libelle_compte:   true,
        partie:           true,
        type_bien:        true,
      },
      distinct: ["compte_principal"],
      orderBy:  { compte_principal: "asc" },
    });

    // Dédoublonner et enrichir avec le nombre d'items
    const comptesCounts = await Promise.all(
      comptes.map(async (c) => ({
        ...c,
        nb_items: await prisma.nomenclatureCompte.count({
          where: { compte_principal: c.compte_principal, actif: true },
        }),
      }))
    );

    return res.json({
      success: true,
      data: comptesCounts,
      meta: { total: comptesCounts.length },
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/nomenclature/categories
// Retourne les catégories distinctes (pour le 2e dropdown)
// Query : ?compte=241&partie=A
// ─────────────────────────────────────────────────────────────────────────────
router.get("/categories", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { compte, partie } = req.query;

    const where: any = { actif: true };
    if (compte) where.compte_principal = String(compte);
    if (partie) where.partie = String(partie);

    const rows = await prisma.nomenclatureCompte.findMany({
      where,
      select: { categorie: true, compte_principal: true },
      distinct: ["categorie"],
      orderBy:  { categorie: "asc" },
    });

    return res.json({ success: true, data: rows, meta: { total: rows.length } });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/nomenclature/familles
// Retourne les familles distinctes (pour le 3e dropdown)
// Query : ?categorie=Mobilier+et+équipements&compte=241
// ─────────────────────────────────────────────────────────────────────────────
router.get("/familles", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { categorie, compte } = req.query;

    const where: any = { actif: true };
    if (categorie) where.categorie        = String(categorie);
    if (compte)    where.compte_principal = String(compte);

    const rows = await prisma.nomenclatureCompte.findMany({
      where,
      select: { famille: true, categorie: true },
      distinct: ["famille"],
      orderBy:  { famille: "asc" },
    });

    return res.json({ success: true, data: rows, meta: { total: rows.length } });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/nomenclature/articles
// Retourne les articles concrets (pour le 4e dropdown — sélection finale)
// Query : ?famille=Mobilier+de+bureau&compte=241&categorie=...
// ─────────────────────────────────────────────────────────────────────────────
router.get("/articles", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { famille, compte, categorie, partie, type_bien } = req.query;

    const where: any = { actif: true };
    if (famille)   where.famille          = String(famille);
    if (compte)    where.compte_principal = String(compte);
    if (categorie) where.categorie        = String(categorie);
    if (partie)    where.partie           = String(partie);
    if (type_bien) where.type_bien        = String(type_bien);

    const articles = await prisma.nomenclatureCompte.findMany({
      where,
      select: {
        code:             true,
        intitule:         true,
        compte_principal: true,
        libelle_compte:   true,
        categorie:        true,
        famille:          true,
        type_bien:        true,
        unite_defaut:     true,
        partie:           true,
      },
      orderBy: [{ compte_principal: "asc" }, { code: "asc" }],
    });

    return res.json({
      success: true,
      data: articles,
      meta: { total: articles.length },
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/nomenclature/search
// Recherche full-text sur code + intitulé
// Query : ?q=bureau&partie=A&limit=20
// ─────────────────────────────────────────────────────────────────────────────
router.get("/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, partie, type_bien, limit = "20" } = req.query;

    if (!q || String(q).trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: { code: "QUERY_TOO_SHORT", message: "Le terme de recherche doit contenir au moins 2 caractères" },
      });
    }

    const terme = String(q).trim();
    const take  = Math.min(parseInt(String(limit)), 100);
    const where: any = {
      actif: true,
      OR: [
        { code:     { contains: terme, mode: "insensitive" } },
        { intitule: { contains: terme, mode: "insensitive" } },
        { libelle_compte: { contains: terme, mode: "insensitive" } },
      ],
    };
    if (partie)    where.partie    = String(partie);
    if (type_bien) where.type_bien = String(type_bien);

    const [results, total] = await Promise.all([
      prisma.nomenclatureCompte.findMany({
        where,
        take,
        orderBy: { code: "asc" },
        select: {
          code: true, intitule: true, partie: true,
          compte_principal: true, libelle_compte: true,
          categorie: true, famille: true, type_bien: true,
          unite_defaut: true,
        },
      }),
      prisma.nomenclatureCompte.count({ where }),
    ]);

    return res.json({
      success: true,
      data: results,
      meta: { total, returned: results.length, terme },
    });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/nomenclature/:code
// Détail d'un code précis
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const item = await prisma.nomenclatureCompte.findUnique({
      where: { code },
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: `Code nomenclature '${code}' introuvable` },
      });
    }

    return res.json({ success: true, data: item });
  } catch (e) {
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/nomenclature/import
// Import en masse (réservé SUPER_ADMIN)
// Body : { data: JsonEntry[] }
// ─────────────────────────────────────────────────────────────────────────────
const importSchema = z.object({
  data: z.array(z.object({
    code:             z.string().regex(/^\d{3}\.\d{3}$/, "Format code invalide (ex: 241.011)"),
    intitule:         z.string().min(2).max(500),
    partie:           z.enum(["A", "B"]),
    compte_principal: z.string().min(3).max(3),
    libelle_compte:   z.string().min(2),
    categorie:        z.string().min(2),
    famille:          z.string().min(2),
    type_bien:        z.enum(["immobilisation", "consommable", "entretien"]),
    unite_defaut:     z.string().optional().nullable(),
    actif:            z.boolean().default(true),
  })).min(1).max(5000),
});

router.post("/import", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { data } = importSchema.parse(req.body);

    let inserted = 0;
    let updated  = 0;

    // Traitement par batch de 100 pour éviter les timeouts
    const BATCH = 100;
    for (let i = 0; i < data.length; i += BATCH) {
      const batch = data.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (item) => {
          const result = await prisma.nomenclatureCompte.upsert({
            where:  { code: item.code },
            create: { ...item, unite_defaut: item.unite_defaut ?? null },
            update: {
              intitule:       item.intitule,
              libelle_compte: item.libelle_compte,
              categorie:      item.categorie,
              famille:        item.famille,
              type_bien:      item.type_bien,
              unite_defaut:   item.unite_defaut ?? null,
              actif:          item.actif,
            },
          });
          // Heuristique insert vs update : impossible de distinguer avec upsert
          // On log simplement le total
          inserted++;
        })
      );
    }

    return res.status(200).json({
      success: true,
      data: { traites: data.length, message: "Import nomenclature terminé avec succès" },
    });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: {
          code:    "VALIDATION_ERROR",
          message: "Données d'import invalides",
          details: e.errors.map((err) => ({
            field:   err.path.join("."),
            message: err.message,
          })),
        },
      });
    }
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/nomenclature
// Créer un nouveau code (ADMIN/SUPER_ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
const createSchema = z.object({
  code:             z.string().regex(/^\d{3}\.\d{3,4}$/, "Format: 241.011"),
  intitule:         z.string().min(2).max(500),
  partie:           z.enum(["A", "B"]),
  compte_principal: z.string().length(3),
  libelle_compte:   z.string().min(2),
  categorie:        z.string().min(2),
  famille:          z.string().min(2),
  type_bien:        z.enum(["immobilisation", "consommable", "entretien"]),
  unite_defaut:     z.string().optional().nullable(),
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);

    const existe = await prisma.nomenclatureCompte.findUnique({
      where: { code: data.code },
    });

    if (existe) {
      return res.status(409).json({
        success: false,
        error: {
          code:    "CODE_ALREADY_EXISTS",
          message: `Le code ${data.code} existe déjà : "${existe.intitule}"`,
        },
      });
    }

    const created = await prisma.nomenclatureCompte.create({
      data: { ...data, actif: true },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: "VALIDATION_ERROR", message: "Données invalides", details: e.errors },
      });
    }
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/v1/nomenclature/:code
// Modifier un code existant (ADMIN)
// ─────────────────────────────────────────────────────────────────────────────
const updateSchema = z.object({
  intitule:     z.string().min(2).max(500).optional(),
  categorie:    z.string().min(2).optional(),
  famille:      z.string().min(2).optional(),
  unite_defaut: z.string().nullable().optional(),
  actif:        z.boolean().optional(),
});

router.put("/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const data = updateSchema.parse(req.body);

    const updated = await prisma.nomenclatureCompte.update({
      where: { code },
      data,
    });

    return res.json({ success: true, data: updated });
  } catch (e: any) {
    if (e.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Code nomenclature introuvable" },
      });
    }
    next(e);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/nomenclature/:code
// Archiver (soft delete) — ADMIN seulement
// On vérifie qu'aucun bien ou article stock n'utilise ce code
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/:code", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;

    // Vérifier les dépendances avant archivage
    const [nbImmo, nbStock] = await Promise.all([
      prisma.immobilisation.count({ where: { code_nomenclature: code } }),
      prisma.articleStock.count({ where: { code_nomenclature: code } }),
    ]);

    if (nbImmo > 0 || nbStock > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: "CODE_IN_USE",
          message: `Ce code est utilisé par ${nbImmo} immobilisation(s) et ${nbStock} article(s) de stock. Archivage impossible.`,
          details: { nb_immobilisations: nbImmo, nb_articles_stock: nbStock },
        },
      });
    }

    await prisma.nomenclatureCompte.update({
      where: { code },
      data:  { actif: false },
    });

    return res.json({
      success: true,
      data: { message: `Code ${code} archivé avec succès` },
    });
  } catch (e: any) {
    if (e.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Code nomenclature introuvable" },
      });
    }
    next(e);
  }
});

export default router;
