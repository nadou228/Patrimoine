import { utils, writeFile, type CellObject, type WorkBook, type WorkSheet } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportUser {
  nom: string;
  prenom?: string;
  role?: string;
  posteComptable?: string;
  ministere?: string;
}

type Primitive = string | number | boolean | null | undefined;
type ExportRow = Record<string, Primitive>;
type ColumnWidth = { wch: number };

const INDIGO = [55, 48, 163] as const;
const INDIGO_LIGHT = [238, 242, 255] as const;
const BORDER = [199, 210, 254] as const;
const MUTED = [100, 116, 139] as const;

const formatDate = (value?: Primitive): string => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("fr-FR");
};

const formatDateTime = (value?: Primitive): string => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("fr-FR");
};

const formatNumber = (value?: Primitive): string => {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("fr-FR") : "0";
};

const formatCurrency = (value?: Primitive): string => `${formatNumber(value)} FCFA`;

const normalizeFilename = (filename: string, extension: ".xlsx" | ".pdf"): string =>
  filename.replace(/\.(xls|xlsx|pdf|html)$/i, "") + extension;

const safeSheetName = (value: string): string =>
  value.replace(/[\\/?*\[\]:]/g, " ").slice(0, 31) || "Export";

const toCellRef = (row: number, column: number) => utils.encode_cell({ r: row, c: column });

const getRowLength = (row?: Array<Primitive>) => (row ? row.length : 0);

const setCell = (sheet: WorkSheet, row: number, column: number, value: Primitive, format?: string) => {
  const ref = toCellRef(row, column);
  const existing = sheet[ref] as CellObject | undefined;

  if (!existing) return;

  if (typeof value === "number" && Number.isFinite(value)) {
    existing.t = "n";
    existing.v = value;
  } else if (typeof value === "boolean") {
    existing.t = "b";
    existing.v = value;
  } else {
    existing.t = "s";
    existing.v = value == null ? "" : String(value);
  }

  if (format) existing.z = format;
};

const applyWorkbookDecorations = (
  sheet: WorkSheet,
  rows: Array<Array<Primitive>>,
  numericFormats?: Record<string, string>
) => {
  rows.forEach((row, rowIndex) => {
    row.forEach((cell, columnIndex) => {
      const headerRowIndex = 6;
      const isHeader = rowIndex === headerRowIndex;
      const isMetadata = rowIndex <= 4;
      const isBlank = row.every((value) => value == null || value === "");
      const format =
        rowIndex > headerRowIndex && numericFormats
          ? numericFormats[String(rows[headerRowIndex]?.[columnIndex] ?? "")]
          : undefined;

      if (isBlank) return;
      if (isMetadata || isHeader) {
        setCell(sheet, rowIndex, columnIndex, cell);
        return;
      }

      setCell(sheet, rowIndex, columnIndex, cell, format);
    });
  });
};

const addSheet = (
  workbook: WorkBook,
  name: string,
  rows: Array<Array<Primitive>>,
  columns?: ColumnWidth[],
  merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[],
  options?: { freezeHeader?: boolean; numericFormats?: Record<string, string> }
) => {
  const sheet = utils.aoa_to_sheet(rows);

  applyWorkbookDecorations(sheet, rows, options?.numericFormats);

  sheet["!cols"] = columns;
  if (merges) sheet["!merges"] = merges;

  if (rows.length > 6 && getRowLength(rows[6]) > 0) {
    sheet["!autofilter"] = {
      ref: utils.encode_range({
        s: { r: 6, c: 0 },
        e: { r: rows.length - 1, c: getRowLength(rows[6]) - 1 },
      }),
    };
  }

  if (options?.freezeHeader) {
    (sheet as WorkSheet & { "!freeze"?: { xSplit?: number; ySplit?: number } })["!freeze"] = {
      xSplit: 0,
      ySplit: 7,
    };
  }

  utils.book_append_sheet(workbook, sheet, safeSheetName(name));
};

const createWorkbook = (): WorkBook => {
  const workbook = utils.book_new();
  workbook.Props = {
    Title: "PATRIS ERP",
    Subject: "Exports patrimoniaux",
    Author: "PATRIS ERP",
    Company: "Republique Togolaise",
    CreatedDate: new Date(),
  };
  return workbook;
};

const saveWorkbook = (workbook: WorkBook, filename: string) => {
  writeFile(workbook, normalizeFilename(filename, ".xlsx"), {
    bookType: "xlsx",
    compression: true,
  });
};

const buildHeaderRows = (title: string, subtitle?: string, user?: ExportUser) => {
  const issuer = user?.ministere || "REPUBLIQUE TOGOLAISE";
  const comptable =
    user?.posteComptable || [user?.prenom, user?.nom].filter(Boolean).join(" ") || "Poste comptable non renseigne";
  const generatedAt = new Date().toLocaleString("fr-FR");

  return [
    [issuer],
    ["Travail - Liberte - Patrie"],
    [title],
    [subtitle || ""],
    [`Genere le ${generatedAt}`, `Responsable: ${comptable}`],
  ];
};

const rowsToSheetData = (
  title: string,
  headers: string[],
  body: Array<Array<Primitive>>,
  footer?: Array<Array<Primitive>>,
  subtitle?: string,
  user?: ExportUser
) => {
  const intro = buildHeaderRows(title, subtitle, user);
  return [...intro, [], headers, ...body, ...(footer ?? [])];
};

const groupRowsByKey = (rows: Record<string, Primitive>[], key: string) =>
  rows.reduce<Record<string, Record<string, Primitive>[]>>((accumulator, row) => {
    const group = String(row[key] || "NON CLASSE");
    if (!accumulator[group]) accumulator[group] = [];
    accumulator[group].push(row);
    return accumulator;
  }, {});

const addWatermark = (doc: jsPDF) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setTextColor(225, 228, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(54);
  doc.text("PATRIS", width / 2, height / 2, {
    align: "center",
    angle: 35,
  });
};

const withPdfHeader = (doc: jsPDF, title: string) => {
  const width = doc.internal.pageSize.getWidth();

  addWatermark(doc);

  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, width, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("REPUBLIQUE TOGOLAISE", 14, 9);
  doc.setFont("helvetica", "normal");
  doc.text("Travail - Liberte - Patrie", 14, 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("PATRIS", width - 14, 14, { align: "right" });

  doc.setTextColor(...INDIGO);
  doc.setFontSize(14);
  doc.text(title, width / 2, 35, { align: "center" });
};

const drawPdfFooter = (doc: jsPDF) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  const stamp = new Date().toLocaleDateString("fr-FR");

  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Page ${page} / ${pageCount} - Genere par PATRIS ERP - ${stamp}`, width / 2, height - 8, {
      align: "center",
    });
  }
};

const drawPdfSignatures = (doc: jsPDF, startY: number) => {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  let y = startY;

  if (y > height - 52) {
    doc.addPage();
    withPdfHeader(doc, "Signatures de validation");
    y = 44;
  }

  const titles = ["Comptable des matieres", "Responsable du patrimoine", "Autorite de validation"];
  const blockWidth = (width - 42) / 3;

  titles.forEach((title, index) => {
    const x = 14 + index * (blockWidth + 7);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, blockWidth, 34, 3, 3);
    doc.setTextColor(...INDIGO);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(title, x + blockWidth / 2, y + 8, { align: "center" });
    doc.setDrawColor(160, 160, 160);
    doc.line(x + 8, y + 24, x + blockWidth - 8, y + 24);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "normal");
    doc.text("Signature", x + blockWidth / 2, y + 30, { align: "center" });
  });
};

export function exportPdf(
  data: ExportRow[],
  title: string,
  filename: string,
  user?: ExportUser,
  extraContent?: { label: string; value: string }[]
) {
  const rows = data.length > 0 ? data : [{ Information: "Aucune donnee disponible" }];
  const headers = Object.keys(rows[0]);
  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const width = doc.internal.pageSize.getWidth();

  withPdfHeader(doc, title);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${user?.posteComptable ? `${user.posteComptable} - ` : ""}Genere le ${new Date().toLocaleString("fr-FR")}`,
    14,
    44
  );

  let startY = 50;

  if (extraContent && extraContent.length > 0) {
    const cardWidth = (width - 28) / extraContent.length;
    extraContent.forEach((item, index) => {
      const x = 14 + index * cardWidth;
      doc.setFillColor(...INDIGO_LIGHT);
      doc.roundedRect(x, 48, cardWidth - 6, 15, 3, 3, "F");
      doc.setTextColor(...INDIGO);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(item.label, x + 4, 54);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.text(item.value, x + 4, 59);
    });
    startY = 68;
  }

  autoTable(doc, {
    startY,
    head: [headers],
    body: rows.map((row) => headers.map((key) => row[key] ?? "")),
    theme: "grid",
    headStyles: {
      fillColor: [...INDIGO],
      textColor: 255,
      lineColor: [...BORDER],
      lineWidth: 0.1,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      lineColor: [...BORDER],
      lineWidth: 0.1,
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [...INDIGO_LIGHT],
    },
    margin: { left: 14, right: 14, top: 50, bottom: 18 },
    didDrawPage: () => withPdfHeader(doc, title),
  });

  const finalY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? startY + 20;
  drawPdfSignatures(doc, finalY + 10);
  drawPdfFooter(doc);
  doc.save(normalizeFilename(filename, ".pdf"));
}

export function exportXlsx<T extends ExportRow>(rows: T[], filename: string, sheetName = "Donnees") {
  const workbook = createWorkbook();
  const headers = rows.length > 0 ? Object.keys(rows[0]) : ["Information"];
  const body =
    rows.length > 0 ? rows.map((row) => headers.map((header) => row[header] ?? "")) : [["Aucune donnee disponible"]];

  addSheet(
    workbook,
    sheetName,
    rowsToSheetData(sheetName, headers, body),
    headers.map((header) => ({ wch: Math.max(16, header.length + 4) })),
    undefined,
    { freezeHeader: true }
  );

  saveWorkbook(workbook, filename);
}

export function exportRegistrePatrimoineExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const headers = [
    "N°",
    "IUP",
    "Designation",
    "Categorie",
    "Sous-categorie",
    "Date acquisition",
    "Valeur",
    "Amortissement cumule",
    "VNC",
    "Etat",
    "Service",
  ];

  const body = biens.map((bien, index) => {
    const valeur = Number(bien.valeur || 0);
    const amortissement = Number(bien.amortissementCumule || 0);

    return [
      index + 1,
      bien.iup,
      bien.designation,
      bien.categoriePrincipale || bien.categorie,
      bien.sousCategorie || bien.codeSousCategorie,
      formatDate(bien.dateAcquisition),
      valeur,
      amortissement,
      valeur - amortissement,
      bien.etat,
      bien.service || bien.localisation,
    ];
  });

  const workbook = createWorkbook();

  addSheet(
    workbook,
    "Registre patrimoine",
    rowsToSheetData(
      "Registre du patrimoine",
      headers,
      body,
      [
        [],
        [
          "TOTAL",
          "",
          "",
          "",
          "",
          "",
          biens.reduce((sum, bien) => sum + Number(bien.valeur || 0), 0),
          biens.reduce((sum, bien) => sum + Number(bien.amortissementCumule || 0), 0),
          biens.reduce((sum, bien) => sum + Number(bien.valeurNetteComptable || 0), 0),
          "",
          "",
        ],
      ],
      "Liste consolidee des biens patrimoniaux",
      user
    ),
    [8, 18, 32, 20, 20, 16, 16, 18, 16, 14, 20].map((wch) => ({ wch })),
    undefined,
    {
      freezeHeader: true,
      numericFormats: {
        Valeur: "#,##0",
        "Amortissement cumule": "#,##0",
        VNC: "#,##0",
      },
    }
  );

  saveWorkbook(workbook, filename);
}

export function exportOrdreEntreeExcel(bien: Record<string, Primitive>, filename: string, user?: ExportUser) {
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Ordre entree",
    rowsToSheetData(
      "Ordre d'entree de matieres",
      ["Champ", "Valeur"],
      [
        ["IUP", bien.iup],
        ["Designation", bien.designation],
        ["Categorie", bien.categoriePrincipale || bien.categorie],
        ["Date acquisition", formatDate(bien.dateAcquisition)],
        ["Valeur", formatCurrency(bien.valeur)],
        ["Service", bien.service || bien.localisation],
        ["Mode acquisition", bien.modeAcquisition],
        ["Observation", bien.observation],
      ],
      undefined,
      "Fiche unitaire d'entree de bien",
      user
    ),
    [{ wch: 24 }, { wch: 40 }],
    undefined,
    { freezeHeader: true }
  );
  saveWorkbook(workbook, filename);
}

export function exportBordereauMutationExcel(
  affectation: Record<string, Primitive> & { bien?: Record<string, Primitive> },
  filename: string,
  user?: ExportUser
) {
  const bien = affectation.bien || {};
  const workbook = createWorkbook();

  addSheet(
    workbook,
    "Bordereau mutation",
    rowsToSheetData(
      "Bordereau de mutation",
      ["Champ", "Valeur"],
      [
        ["Bien", bien.designation],
        ["IUP", bien.iup],
        ["Detenteur", affectation.detenteur],
        ["Service", affectation.service],
        ["Date affectation", formatDate(affectation.dateAffectation)],
        ["Statut", affectation.statutValidation],
        ["Motif", affectation.motif],
      ],
      undefined,
      "Transfert de responsabilite patrimoniale",
      user
    ),
    [{ wch: 24 }, { wch: 46 }],
    undefined,
    { freezeHeader: true }
  );

  saveWorkbook(workbook, filename);
}

export function exportLivreJournalImmobilisationsExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const rows = [...biens]
    .sort((a, b) => String(a.dateAcquisition || "").localeCompare(String(b.dateAcquisition || "")))
    .map((bien, index) => [
      index + 1,
      formatDate(bien.dateAcquisition),
      bien.codeSousCategorie || bien.codeBien || bien.iup,
      bien.designation,
      bien.categoriePrincipale || bien.categorie,
      Number(bien.quantite || 1),
      Number(bien.valeur || 0),
      bien.service || bien.localisation,
    ]);

  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Livre journal",
    rowsToSheetData(
      "Livre journal des immobilisations",
      ["Ordre", "Date", "Reference", "Designation", "Categorie", "Quantite entree", "Valeur entree", "Service"],
      rows,
      undefined,
      "Chronologie des mouvements patrimoniaux",
      user
    ),
    [10, 16, 18, 32, 20, 16, 18, 24].map((wch) => ({ wch })),
    undefined,
    {
      freezeHeader: true,
      numericFormats: {
        "Quantite entree": "#,##0",
        "Valeur entree": "#,##0",
      },
    }
  );
  saveWorkbook(workbook, filename);
}

export function exportLivreJournalFournituresExcel(
  mouvements: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Journal fournitures",
    rowsToSheetData(
      "Livre journal des fournitures",
      ["Ordre", "Date", "Article", "Type", "Quantite", "Destination", "Observation"],
      mouvements.map((mouvement, index) => [
        index + 1,
        formatDate(mouvement.dateMouvement || mouvement.date),
        mouvement.nomProduit || mouvement.consommable || mouvement.reference,
        mouvement.type || mouvement.typeMouvement,
        Number(mouvement.quantite || 0),
        mouvement.serviceDestinataire || mouvement.service,
        mouvement.observation || mouvement.motif,
      ]),
      undefined,
      "Flux d'entree et de sortie magasin",
      user
    ),
    [10, 16, 26, 18, 14, 24, 34].map((wch) => ({ wch })),
    undefined,
    {
      freezeHeader: true,
      numericFormats: { Quantite: "#,##0" },
    }
  );
  saveWorkbook(workbook, filename);
}

export function exportFicheStockExcel(
  item: Record<string, Primitive>,
  mouvements: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const workbook = createWorkbook();

  addSheet(
    workbook,
    "Synthese stock",
    rowsToSheetData(
      "Fiche de stock",
      ["Champ", "Valeur"],
      [
        ["Article", item.nomProduit || item.designation || item.codeArticle],
        ["Code", item.codeArticle || item.reference],
        ["Seuil alerte", item.seuilAlerte],
        ["Quantite actuelle", item.quantite],
        ["Unite", item.unite],
        ["Prix moyen", formatCurrency(item.prixMoyenPondere)],
      ],
      undefined,
      "Situation de stock et mouvements",
      user
    ),
    [{ wch: 26 }, { wch: 34 }],
    undefined,
    { freezeHeader: true }
  );

  addSheet(
    workbook,
    "Mouvements",
    rowsToSheetData(
      "Historique des mouvements",
      ["Date", "Type", "Quantite", "Service", "Observation"],
      mouvements.map((mouvement) => [
        formatDate(mouvement.dateMouvement || mouvement.date),
        mouvement.type || mouvement.typeMouvement,
        Number(mouvement.quantite || 0),
        mouvement.serviceDestinataire || mouvement.service || "",
        mouvement.observation || mouvement.motif || "",
      ]),
      undefined,
      "Flux lies a la fiche de stock",
      user
    ),
    [{ wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 42 }],
    undefined,
    { freezeHeader: true, numericFormats: { Quantite: "#,##0" } }
  );

  saveWorkbook(workbook, filename);
}

export function exportGrandLivreExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const grouped = groupRowsByKey(biens, "codeFamille");
  const body: Array<Array<Primitive>> = [];

  Object.entries(grouped).forEach(([compte, items]) => {
    let solde = 0;
    body.push([compte, "SOUS-ENSEMBLE", "", "", "", "", "", ""]);

    items
      .sort((a, b) => String(a.dateAcquisition || "").localeCompare(String(b.dateAcquisition || "")))
      .forEach((bien) => {
        const valeur = Number(bien.valeur || 0);
        solde += valeur;
        body.push([
          compte,
          formatDate(bien.dateAcquisition),
          bien.codeSousCategorie || bien.iup,
          bien.designation,
          bien.service || bien.localisation,
          valeur,
          0,
          solde,
        ]);
      });

    body.push([compte, "", "", `Sous-total ${compte}`, "", "", "", solde]);
    body.push([]);
  });

  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Grand livre",
    rowsToSheetData(
      "Grand livre des immobilisations",
      ["Compte", "Date", "Reference", "Designation", "Service", "Debit", "Credit", "Solde"],
      body,
      undefined,
      "Lecture comptable par compte patrimonial",
      user
    ),
    [16, 16, 18, 32, 24, 16, 16, 18].map((wch) => ({ wch })),
    undefined,
    {
      freezeHeader: true,
      numericFormats: {
        Debit: "#,##0",
        Credit: "#,##0",
        Solde: "#,##0",
      },
    }
  );
  saveWorkbook(workbook, filename);
}

export function exportGrandLivreFournituresExcel(
  mouvements: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Grand livre fournitures",
    rowsToSheetData(
      "Grand livre des fournitures",
      ["Article", "Date", "Type", "Quantite", "Service", "Solde"],
      mouvements.map((mouvement) => [
        mouvement.nomProduit || mouvement.reference,
        formatDate(mouvement.dateMouvement || mouvement.date),
        mouvement.type || mouvement.typeMouvement,
        Number(mouvement.quantite || 0),
        mouvement.serviceDestinataire || mouvement.service,
        Number(mouvement.solde || mouvement.quantiteRestante || 0),
      ]),
      undefined,
      "Lecture comptable des consommables",
      user
    ),
    [28, 16, 16, 14, 24, 14].map((wch) => ({ wch })),
    undefined,
    {
      freezeHeader: true,
      numericFormats: {
        Quantite: "#,##0",
        Solde: "#,##0",
      },
    }
  );
  saveWorkbook(workbook, filename);
}

export function exportPvRecensementExcel(
  recensement: Record<string, Primitive>,
  filename: string,
  user?: ExportUser
) {
  const workbook = createWorkbook();
  addSheet(
    workbook,
    "PV recensement",
    rowsToSheetData(
      "Proces-verbal de recensement",
      ["Champ", "Valeur"],
      Object.entries(recensement).map(([key, value]) => [key, value]),
      undefined,
      "Constat contradictoire de recensement",
      user
    ),
    [{ wch: 28 }, { wch: 46 }],
    undefined,
    { freezeHeader: true }
  );
  saveWorkbook(workbook, filename);
}

export function exportEtatRecapitulatifExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const grouped = groupRowsByKey(biens, "categoriePrincipale");
  const rows = Object.entries(grouped).map(([categorie, items]) => [
    categorie,
    items.length,
    items.reduce((sum, bien) => sum + Number(bien.valeur || 0), 0),
    items.reduce((sum, bien) => sum + Number(bien.amortissementCumule || 0), 0),
    items.reduce((sum, bien) => sum + Number(bien.valeurNetteComptable || 0), 0),
  ]);

  const workbook = createWorkbook();
  addSheet(
    workbook,
    "Etat recapitulatif",
    rowsToSheetData(
      "Etat recapitulatif des immobilisations",
      ["Categorie", "Nombre", "Valeur brute", "Amortissement", "VNC"],
      rows,
      undefined,
      "Synthese par categorie de biens",
      user
    ),
    [28, 14, 18, 18, 18].map((wch) => ({ wch })),
    undefined,
    {
      freezeHeader: true,
      numericFormats: {
        Nombre: "#,##0",
        "Valeur brute": "#,##0",
        Amortissement: "#,##0",
        VNC: "#,##0",
      },
    }
  );
  saveWorkbook(workbook, filename);
}

export function exportInventaireCompletExcel(
  campagne: Record<string, Primitive>,
  fiches: Array<Record<string, Primitive>>,
  ecarts: Array<Record<string, Primitive>>
) {
  const workbook = createWorkbook();

  addSheet(
    workbook,
    "Campagne",
    rowsToSheetData(
      "Campagne d'inventaire",
      ["Champ", "Valeur"],
      [
        ["Nom", campagne.nom],
        ["Sites", campagne.sites],
        ["Equipes", campagne.equipes],
        ["Date debut", formatDate(campagne.dateDebut)],
        ["Date fin", formatDate(campagne.dateFin)],
        ["Statut", campagne.statut],
      ],
      undefined,
      "Vue de pilotage de la campagne"
    ),
    [{ wch: 24 }, { wch: 44 }],
    undefined,
    { freezeHeader: true }
  );

  addSheet(
    workbook,
    "Fiches",
    rowsToSheetData(
      "Fiches de recensement",
      [
        "IUP",
        "Designation",
        "Localisation reference",
        "Localisation reelle",
        "Etat constate",
        "Anomalie",
        "Validation agent",
        "Validation superviseur",
      ],
      fiches.map((fiche) => [
        fiche.codeIup || fiche.iup || fiche["bien.iup"],
        fiche.designation || fiche["bien.designation"],
        fiche.localisation || fiche["bien.localisation"],
        fiche.localisationReelle,
        fiche.etatConstate,
        fiche.anomalie ? "Oui" : "Non",
        fiche.validationAgent,
        fiche.validationSuperviseur,
      ]),
      undefined,
      "Consolidation des fiches terrain"
    ),
    [16, 30, 24, 24, 18, 12, 18, 20].map((wch) => ({ wch })),
    undefined,
    { freezeHeader: true }
  );

  addSheet(
    workbook,
    "Ecarts",
    rowsToSheetData(
      "Ecarts d'inventaire",
      ["Bien", "IUP", "Type ecart", "Statut", "Justification"],
      ecarts.map((ecart) => [
        ecart.designation || ecart["bien.designation"],
        ecart.iup || ecart["bien.iup"],
        ecart.typeEcart,
        ecart.statutValidation,
        ecart.justification,
      ]),
      undefined,
      "Elements a regulariser"
    ),
    [30, 16, 18, 16, 42].map((wch) => ({ wch })),
    undefined,
    { freezeHeader: true }
  );

  saveWorkbook(workbook, `Inventaire_${String(campagne.nom || "campagne")}.xlsx`);
}

export function exportPvInventaireCertifie(
  campagne: Record<string, Primitive>,
  fiches: Array<Record<string, Primitive>>,
  ecarts: Array<Record<string, Primitive>>
) {
  const rows = ecarts.map((ecart) => ({
    Bien: ecart.designation || ecart["bien.designation"] || "-",
    IUP: ecart.iup || ecart["bien.iup"] || "-",
    "Type d'ecart": ecart.typeEcart || "-",
    Statut: ecart.statutValidation || "-",
    Justification: ecart.justification || "-",
  }));

  exportPdf(
    rows,
    `Proces-verbal d'inventaire certifie - ${String(campagne.nom || "Campagne")}`,
    `PV_Inventaire_${String(campagne.nom || "campagne")}.pdf`,
    undefined,
    [
      { label: "Actifs audites", value: String(fiches.length) },
      { label: "Ecarts", value: String(ecarts.length) },
      { label: "Statut", value: String(campagne.statut || "N/A") },
    ]
  );
}

export function exportLivreJournalPremiumExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  exportLivreJournalImmobilisationsExcel(biens, filename, user);
}

export function exportGrandLivrePremiumExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  exportGrandLivreExcel(biens, filename, user);
}
