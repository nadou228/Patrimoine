import ExcelJS from 'exceljs';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { utils, writeFile, WorkBook, WorkSheet, CellObject } from "xlsx";

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
type Rgb = [number, number, number];
type PdfGStateConstructor = new (options: { opacity: number }) => unknown;
type JsPdfWithGState = jsPDF & { GState: PdfGStateConstructor };

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

async function createStyledWorkbook(title: string, columns: any[], rows: any[], user?: ExportUser): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PATRIS ERP';
  wb.created = new Date();
  
  const ws = wb.addWorksheet(title, {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true }
  });

  // Couleurs de charte
  const BLEU_INST = '1A3A6E';
  const BLEU_COL  = '2F75B6';
  const DORE      = 'C9A84C';
  const VERT_PALE = 'E2EFDA';
  const BLEU_PALE = 'EBF3FB';
  const SOUS_TOT  = 'D9E1F2';

  // Ligne 1 — En-tête institutionnel fusionnée
  ws.mergeCells(`A1:${String.fromCharCode(65 + columns.length - 1)}1`);
  const headerCell = ws.getCell('A1');
  headerCell.value = `REPUBLIQUE TOGOLAISE — ${title.toUpperCase()}`;
  headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLEU_INST } };
  headerCell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 14, name: 'Calibri' };
  headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // Ligne 2 — Poste comptable
  // Ligne 3 — Sous-titre document
  // ... (construire selon chaque type de document)
  
  // Ligne 2 : Poste Comptable / Institution
  ws.mergeCells(`A2:${String.fromCharCode(65 + columns.length - 1)}2`);
  const instCell = ws.getCell('A2');
  instCell.value = user?.ministere || "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES";
  instCell.font = { size: 10, italic: true, color: { argb: 'FF444444' } };
  instCell.alignment = { horizontal: 'center' };

  // Ligne 3 : Date de génération
  ws.mergeCells(`A3:${String.fromCharCode(65 + columns.length - 1)}3`);
  const dateCell = ws.getCell('A3');
  dateCell.value = `Document généré le ${new Date().toLocaleDateString('fr-FR')} par PATRIS ERP`;
  dateCell.font = { size: 9, color: { argb: 'FF888888' } };
  dateCell.alignment = { horizontal: 'center' };

  // En-têtes colonnes
  columns.forEach((col, i) => {
    const cell = ws.getCell(5, i + 1);
    cell.value = col.header;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLEU_COL } };
    cell.font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9, name: 'Calibri' };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { 
      top: { style: 'medium', color: { argb: 'FF' + BLEU_INST } }, 
      bottom: { style: 'medium', color: { argb: 'FF' + BLEU_INST } }, 
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, 
      right: { style: 'thin', color: { argb: 'FFFFFFFF' } } 
    };
    ws.getColumn(i + 1).width = col.width || 15;
  });

  // Données avec lignes alternées
  rows.forEach((row, rowIdx) => {
    const isEven = rowIdx % 2 === 0;
    columns.forEach((col, colIdx) => {
      const cell = ws.getCell(rowIdx + 6, colIdx + 1);
      const val = row[col.key];
      
      // Formatting based on content type
      if (typeof val === 'number') {
        cell.value = val;
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      } else {
        cell.value = val;
        cell.alignment = { horizontal: col.align || 'left', vertical: 'middle', wrapText: true };
      }

      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFFFFFF' : 'FF' + BLEU_PALE } };
      cell.border = { 
        bottom: { style: 'thin', color: { argb: 'FFD9E1F2' } }, 
        left: { style: 'thin', color: { argb: 'FFD9E1F2' } }, 
        right: { style: 'thin', color: { argb: 'FFD9E1F2' } } 
      };
      cell.font = { size: 9, name: 'Calibri', color: { argb: 'FF333333' } };
    });
  });

  // Footer area (Signatures)
  const lastDataRow = rows.length + 7;
  const sigRow = lastDataRow + 2;
  
  const footerLabels = ["Le Comptable des Matières", "Le Gestionnaire du Patrimoine", "L'Ordonnateur"];
  const colsPerSign = Math.floor(columns.length / 3);

  footerLabels.forEach((label, i) => {
    const startCol = (i * colsPerSign) + 1;
    const endCol = startCol + colsPerSign - 1;
    ws.mergeCells(sigRow, startCol, sigRow, endCol);
    const cell = ws.getCell(sigRow, startCol);
    cell.value = label;
    cell.font = { bold: true, size: 10, color: { argb: 'FF1A3A6E' } };
    cell.alignment = { horizontal: 'center' };
    
    // Line for signature
    ws.mergeCells(sigRow + 4, startCol, sigRow + 4, endCol);
    const lineCell = ws.getCell(sigRow + 4, startCol);
    lineCell.border = { bottom: { style: 'thin', color: { argb: 'FF000000' } } };
  });

  return wb;
}

// Téléchargement natif .xlsx
async function downloadNativeXlsx(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : filename + '.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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

function buildInstitutionalPdfHeader(doc: jsPDF, title: string, user?: ExportUser) {
  const W = doc.internal.pageSize.getWidth();
  
  // Bandeau bleu marine
  doc.setFillColor(26, 58, 110);
  doc.rect(0, 0, W, 28, 'F');
  
  // Ligne dorée
  doc.setFillColor(201, 168, 76);
  doc.rect(0, 28, W, 1.5, 'F');
  
  // Logo PATRIS
  doc.setFontSize(10); doc.setTextColor(201, 168, 76);
  doc.setFont('helvetica', 'bold');
  doc.text('PATRIS', W - 20, 10, { align: 'right' });
  doc.setFontSize(7); doc.setTextColor(255,255,255);
  doc.text('PILOTAGE PATRIMONIAL', W - 20, 15, { align: 'right' });
  
  // République Togolaise
  doc.setFontSize(11); doc.setTextColor(255,255,255);
  doc.text('REPUBLIQUE TOGOLAISE', 14, 10);
  doc.setFontSize(8); doc.setTextColor(200,210,230);
  doc.text('Travail — Liberté — Patrie', 14, 16);
  
  // Titre centré
  doc.setFontSize(15); doc.setTextColor(26,58,110);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), W/2, 40, { align: 'center' });
  
  // Filigrane
  doc.saveGraphicsState();
  doc.setGState(new (doc as JsPdfWithGState).GState({ opacity: 0.04 }));
  doc.setFontSize(60); doc.setTextColor(26,58,110);
  doc.text('PATRIS', W/2, doc.internal.pageSize.getHeight()/2, { align: 'center', angle: 35 });
  doc.restoreGraphicsState();
}

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
    buildInstitutionalPdfHeader(doc, "Signatures de validation");
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

  buildInstitutionalPdfHeader(doc, title);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(
    `${user?.posteComptable ? `${user.posteComptable} - ` : ""}Généré le ${new Date().toLocaleString("fr-FR")}`,
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
    didDrawPage: () => buildInstitutionalPdfHeader(doc, title),
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

export async function exportRegistrePatrimoineExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const columns = [
    { header: "N°", key: "n", width: 8 },
    { header: "IUP", key: "iup", width: 18 },
    { header: "Désignation", key: "designation", width: 32 },
    { header: "Catégorie", key: "categorie", width: 20 },
    { header: "Sous-catégorie", key: "sousCategorie", width: 20 },
    { header: "Date acquisition", key: "dateAcquisition", width: 16 },
    { header: "Valeur", key: "valeur", width: 16 },
    { header: "Amortissement cumulé", key: "amortissementCumule", width: 18 },
    { header: "VNC", key: "vnc", width: 16 },
    { header: "État", key: "etat", width: 14 },
    { header: "Service", key: "service", width: 20 },
  ];

  const rows = biens.map((bien, index) => ({
    n: index + 1,
    iup: bien.iup,
    designation: bien.designation,
    categorie: bien.categoriePrincipale || bien.categorie,
    sousCategorie: bien.sousCategorie || bien.codeSousCategorie,
    dateAcquisition: formatDate(bien.dateAcquisition),
    valeur: Number(bien.valeur || 0),
    amortissementCumule: Number(bien.amortissementCumule || 0),
    vnc: Number(bien.valeur || 0) - Number(bien.amortissementCumule || 0),
    etat: bien.etat,
    service: bien.service || bien.localisation,
  }));

  const wb = await createStyledWorkbook("Registre du Patrimoine", columns, rows, user);
  
  // Add total row
  const ws = wb.getWorksheet("Registre du Patrimoine");
  if (ws) {
    const totalRow = ws.addRow(['TOTAL', '', '', '', '', '', biens.reduce((sum, bien) => sum + Number(bien.valeur || 0), 0), biens.reduce((sum, bien) => sum + Number(bien.amortissementCumule || 0), 0), biens.reduce((sum, bien) => sum + (Number(bien.valeur || 0) - Number(bien.amortissementCumule || 0)), 0), '', '']);
    totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F75B6' } };
    totalRow.font = { color: { argb: 'FFFFFFFF' }, bold: true };
  }
  
  await downloadNativeXlsx(wb, filename);
}

export async function exportOrdreEntreeExcel(bien: Record<string, Primitive>, filename: string, user?: ExportUser) {
  const columns = [
    { header: "Champ", key: "champ", width: 24 },
    { header: "Valeur", key: "valeur", width: 40 },
  ];

  const rows = [
    { champ: "IUP", valeur: bien.iup },
    { champ: "Désignation", valeur: bien.designation },
    { champ: "Catégorie", valeur: bien.categoriePrincipale || bien.categorie },
    { champ: "Date acquisition", valeur: formatDate(bien.dateAcquisition) },
    { champ: "Valeur", valeur: formatCurrency(bien.valeur) },
    { champ: "Service", valeur: bien.service || bien.localisation },
    { champ: "Mode acquisition", valeur: bien.modeAcquisition },
    { champ: "Observation", valeur: bien.observation },
  ];

  const wb = await createStyledWorkbook("Ordre d'Entrée de Matières", columns, rows, user);
  await downloadNativeXlsx(wb, filename);
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

export async function exportLivreJournalPremiumExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser,
  filters?: { exercice?: string; poste?: string }
) {
  const columns = [
    { header: "FOLIO / N°", key: "folio", width: 12, align: 'center' },
    { header: "DATE OPÉRATION", key: "date", width: 16, align: 'center' },
    { header: "PIÈCE JUSTIFICATIVE", key: "piece", width: 20 },
    { header: "DÉSIGNATION DES MATIÈRES", key: "designation", width: 35 },
    { header: "UNITÉ", key: "unite", width: 10, align: 'center' },
    { header: "QTE ENTRÉE", key: "qte", width: 12, align: 'right' },
    { header: "VALEUR UNITAIRE", key: "prixUnitaire", width: 18, align: 'right' },
    { header: "VALEUR TOTALE (CFA)", key: "valeurTotale", width: 22, align: 'right' },
    { header: "ORIGINE / FOURNISSEUR", key: "origine", width: 25 },
  ];

  const rows = biens.map((bien, index) => ({
    folio: index + 1,
    date: formatDate(bien.dateAcquisition),
    piece: bien.referenceFacture || bien.numFacture || "N/A",
    designation: bien.designation,
    unite: bien.unite || "U",
    qte: Number(bien.quantite || 1),
    prixUnitaire: Number(bien.valeur || 0),
    valeurTotale: Number(bien.valeur || 0) * Number(bien.quantite || 1),
    origine: bien.fournisseur || bien.vendeur || "INVENTAIRE INITIAL",
  }));

  const title = `Livre Journal des Immobilisations — EXERCICE ${filters?.exercice || new Date().getFullYear()}`;
  const wb = await createStyledWorkbook(title, columns, rows, user);
  
  // Customization: Totals
  const ws = wb.getWorksheet(title);
  if (ws) {
    const totalRowIdx = rows.length + 6;
    const totalRow = ws.getRow(totalRowIdx);
    
    // Total label
    ws.mergeCells(totalRowIdx, 1, totalRowIdx, 7);
    const labelCell = ws.getCell(totalRowIdx, 1);
    labelCell.value = "TOTAL GÉNÉRAL DES ENTRÉES DE L'EXERCICE";
    labelCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A3A6E' } };
    labelCell.alignment = { horizontal: 'right' };

    // Total value
    const valCell = ws.getCell(totalRowIdx, 8);
    const totalVal = rows.reduce((acc, r) => acc + r.valeurTotale, 0);
    valCell.value = totalVal;
    valCell.numFmt = '#,##0 "CFA"';
    valCell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    valCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A84C' } }; // Gold color for total
    valCell.alignment = { horizontal: 'right' };
  }

  await downloadNativeXlsx(wb, filename);
}

export async function exportLivreJournalImmobilisationsExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  // Legacy alias calling the new premium version
  return exportLivreJournalPremiumExcel(biens, filename, user);
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

export async function exportGrandLivreExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  const columns = [
    { header: "Compte", key: "compte", width: 16 },
    { header: "Date", key: "date", width: 16 },
    { header: "Référence", key: "reference", width: 18 },
    { header: "Désignation", key: "designation", width: 32 },
    { header: "Service", key: "service", width: 24 },
    { header: "Débit", key: "debit", width: 16 },
    { header: "Crédit", key: "credit", width: 16 },
    { header: "Solde", key: "solde", width: 18 },
  ];

  const rows: any[] = [];
  const grouped = groupRowsByKey(biens, "codeFamille");

  Object.entries(grouped).forEach(([compte, items]) => {
    let solde = 0;
    rows.push({ compte, date: "SOUS-ENSEMBLE", reference: "", designation: "", service: "", debit: "", credit: "", solde: "" });

    items
      .sort((a, b) => String(a.dateAcquisition || "").localeCompare(String(b.dateAcquisition || "")))
      .forEach((bien) => {
        const valeur = Number(bien.valeur || 0);
        solde += valeur;
        rows.push({
          compte,
          date: formatDate(bien.dateAcquisition),
          reference: bien.codeSousCategorie || bien.iup,
          designation: bien.designation,
          service: bien.service || bien.localisation,
          debit: valeur,
          credit: 0,
          solde,
        });
      });

    rows.push({ compte, date: "", reference: "", designation: `Sous-total ${compte}`, service: "", debit: "", credit: "", solde });
  });

  const wb = await createStyledWorkbook("Grand Livre des Immobilisations", columns, rows, user);
  await downloadNativeXlsx(wb, filename);
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

export async function exportCertificatInventaire(
  campagne: any,
  stats: { totalActifs: number; valeurTotale: number; conformite: number; ecarts: number },
  user: ExportUser
): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(); // 210mm
  const H = doc.internal.pageSize.getHeight(); // 297mm

  // ── COULEURS ──
  const BLEU_MARINE: Rgb = [26, 58, 110];
  const DORE: Rgb = [201, 168, 76];
  const BLEU_MED: Rgb = [47, 117, 182];
  const VERT_CERT: Rgb = [5, 150, 105];

  // ── BORDURES DÉCORATIVES ──
  doc.setDrawColor(...BLEU_MARINE);
  doc.setLineWidth(1.5);
  doc.rect(5, 5, W-10, H-10);   // bordure externe
  doc.setDrawColor(...DORE);
  doc.setLineWidth(0.5);
  doc.rect(8, 8, W-16, H-16);   // bordure dorée interne

  // ── BANDEAU EN-TÊTE ──
  doc.setFillColor(...BLEU_MARINE);
  doc.rect(8, 8, W-16, 42, 'F');
  
  // Ligne dorée sous l'en-tête
  doc.setFillColor(...DORE);
  doc.rect(8, 50, W-16, 1.2, 'F');

  // Texte en-tête gauche
  doc.setTextColor(201, 168, 76); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('REPUBLIQUE TOGOLAISE', 14, 22);
  doc.setTextColor(255,255,255); doc.setFontSize(7);
  doc.text('Travail — Liberté — Patrie', 14, 28);
  doc.setFontSize(7); doc.setTextColor(180, 200, 230);
  doc.text('Ministère de l\'Économie et des Finances', 14, 34);
  doc.text('Direction Générale du Patrimoine', 14, 39);

  // Badge PATRIS au centre
  doc.setFillColor(201, 168, 76);
  doc.circle(W/2, 28, 12, 'F');
  doc.setFillColor(26, 58, 110);
  doc.circle(W/2, 28, 9, 'F');
  doc.setTextColor(201, 168, 76); doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('P', W/2, 32, { align: 'center' });
  doc.setTextColor(240, 208, 128); doc.setFontSize(10);
  doc.text('PATRIS', W/2, 44, { align: 'center' });

  // Exercice à droite
  doc.setTextColor(255,255,255); doc.setFontSize(8);
  doc.text(`Exercice ${new Date().getFullYear()}`, W-14, 22, { align: 'right' });

  // Banner type certificat
  doc.setFillColor(201, 168, 76, 0.15);
  doc.rect(8, 51, W-16, 10);
  doc.setTextColor(201, 168, 76); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICAT OFFICIEL DE PATRIMOINE', W/2, 57.5, { align: 'center' });

  // ── TITRE PRINCIPAL ──
  doc.setTextColor(26, 58, 110); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('INVENTAIRE CERTIFIÉ DU PATRIMOINE', W/2, 75, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(90, 106, 138); doc.setFont('helvetica', 'normal');
  doc.text('Procès-Verbal d\'Inventaire Physique & Évaluation Comptable', W/2, 82, { align: 'center' });

  // Ligne séparatrice dorée
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.5);
  doc.line(20, 86, W-20, 86);

  // ── CARTES META (3 colonnes) ──
  const metaCards = [
    { label: 'Référence', value: `PV-${new Date().getFullYear()}-${String(campagne.id || 1).padStart(4,'0')}` },
    { label: 'Date d\'émission', value: new Date().toLocaleDateString('fr-FR') },
    { label: 'Exercice budgétaire', value: `${new Date().getFullYear()-1} – ${new Date().getFullYear()}` }
  ];
  metaCards.forEach((card, i) => {
    const x = 14 + i * (W-28)/3 + 2;
    const cardW = (W-28)/3 - 4;
    doc.setFillColor(247, 248, 252); doc.setDrawColor(228, 232, 242);
    doc.roundedRect(x, 90, cardW, 18, 2, 2, 'FD');
    doc.setFontSize(7); doc.setTextColor(136, 153, 187); doc.setFont('helvetica', 'bold');
    doc.text(card.label.toUpperCase(), x + cardW/2, 96, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor(13, 42, 94); doc.setFont('helvetica', 'bold');
    doc.text(card.value, x + cardW/2, 103, { align: 'center' });
  });

  // ── INFOS POSTE COMPTABLE ──
  doc.setFillColor(249, 249, 251); doc.setDrawColor(26, 58, 110);
  doc.setLineWidth(0); doc.rect(14, 114, W-28, 36, 'F');
  doc.setDrawColor(26, 58, 110); doc.setLineWidth(1.5);
  doc.line(14, 114, 14, 150); // bordure gauche bleue
  doc.setLineWidth(0.3); doc.setDrawColor(228, 232, 242);
  doc.rect(14, 114, W-28, 36, 'D');

  doc.setFontSize(7); doc.setTextColor(136,153,187); doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS DU POSTE COMPTABLE', 20, 121);
  
  const infoFields = [
    ['Poste Comptable', campagne.sites || 'Direction du Matériel'],
    ['Périmètre d\'inventaire', 'Patrimoine National — Lomé'],
    ['Date de début de mission', campagne.dateDebut || '——'],
    ['Date de clôture', campagne.dateFin || new Date().toLocaleDateString('fr-FR')],
  ];
  infoFields.forEach(([lbl, val], i) => {
    const y = 128 + i * 6;
    doc.setFontSize(8); doc.setTextColor(102,102,119); doc.setFont('helvetica', 'normal');
    doc.text(lbl + ' :', 20, y);
    doc.setTextColor(26, 42, 78); doc.setFont('helvetica', 'bold');
    doc.text(val, W/2, y, { align: 'left' });
  });

  // ── KPI CARDS ──
  const kpis: Array<{ val: string; lbl: string; color: Rgb }> = [
    { val: stats.totalActifs.toString(), lbl: 'Actifs recensés', color: [37, 99, 235] },
    { val: `${(stats.valeurTotale/1e6).toFixed(1)}M`, lbl: 'Valeur FCFA', color: [5, 150, 105] },
    { val: `${stats.conformite}%`, lbl: 'Conformité', color: [217, 119, 6] },
    { val: stats.ecarts.toString(), lbl: 'Écarts constatés', color: [124, 58, 237] },
  ];
  kpis.forEach((kpi, i) => {
    const x = 14 + i * (W-28)/4 + 2;
    const kW = (W-28)/4 - 4;
    doc.setFillColor(255,255,255); doc.setDrawColor(224, 228, 240);
    doc.roundedRect(x, 156, kW, 24, 2, 2, 'FD');
    doc.setFillColor(...kpi.color);
    doc.rect(x, 156, kW, 1.5, 'F');
    doc.setFontSize(16); doc.setTextColor(...kpi.color); doc.setFont('helvetica', 'bold');
    doc.text(kpi.val, x + kW/2, 170, { align: 'center' });
    doc.setFontSize(7); doc.setTextColor(136,153,187); doc.setFont('helvetica', 'bold');
    doc.text(kpi.lbl.toUpperCase(), x + kW/2, 176, { align: 'center' });
  });

  // ── BANDE DE STATUT ──
  doc.setFillColor(240, 253, 248); doc.setDrawColor(110, 231, 183);
  doc.roundedRect(14, 186, W-28, 14, 2, 2, 'FD');
  doc.setFillColor(5, 150, 105); doc.circle(22, 193, 4, 'F');
  doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  doc.text('✓', 22, 195.5, { align: 'center' });
  doc.setTextColor(6, 95, 70); doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('INVENTAIRE CERTIFIÉ CONFORME — Validé par la Commission Officielle', 30, 195);

  // ── ATTESTATION ──
  doc.setFillColor(255, 253, 245); doc.setDrawColor(184, 160, 96);
  doc.setLineWidth(0); doc.rect(14, 206, W-28, 28, 'F');
  doc.setLineWidth(1.5); doc.setDrawColor(184, 160, 96);
  doc.line(14, 206, 14, 234);
  doc.setLineWidth(0.3); doc.setDrawColor(220, 210, 180); doc.rect(14, 206, W-28, 28, 'D');
  doc.setFontSize(7); doc.setTextColor(136,153,187); doc.setFont('helvetica', 'bold');
  doc.text('ATTESTATION DE CERTIFICATION', 20, 213);
  doc.setFontSize(8); doc.setTextColor(68,68,68); doc.setFont('helvetica', 'italic');
  const attestText = '"La Commission d\'Inventaire, dûment constituée par arrêté, certifie avoir procédé au recensement physique et à la valorisation comptable du patrimoine. Le présent certificat est délivré conformément aux dispositions de la réglementation togolaise sur la comptabilité des matières."';
  const lines = doc.splitTextToSize(attestText, W-40);
  doc.text(lines, 20, 220);

  // ── CACHET VERT (CERTIFIÉ) ──
  doc.setDrawColor(5, 150, 105); doc.setLineWidth(1.5);
  doc.circle(W-30, 220, 14, 'D');
  doc.setDrawColor(5, 150, 105); doc.setLineWidth(0.5);
  doc.circle(W-30, 220, 11, 'D');
  doc.setTextColor(5, 150, 105); doc.setFontSize(6); doc.setFont('helvetica', 'bold');
  doc.text('CERTIFIÉ', W-30, 217, { align: 'center' });
  doc.text('CONFORME', W-30, 221, { align: 'center' });
  doc.text('PATRIS', W-30, 225, { align: 'center' });

  // ── SIGNATURES ──
  const sigs = [
    { titre: 'L\'Agent Comptable', nom: user.nom },
    { titre: 'Le Superviseur d\'Audit', nom: '' },
    { titre: 'L\'Ordonnateur des Matières', nom: '' }
  ];
  doc.setDrawColor(26, 58, 110); doc.setLineWidth(0.3);
  doc.line(14, 238, W-14, 238);
  sigs.forEach((sig, i) => {
    const x = 14 + i * (W-28)/3 + 2;
    const sw = (W-28)/3 - 4;
    doc.setFontSize(7); doc.setTextColor(13, 42, 94); doc.setFont('helvetica', 'bold');
    doc.text(sig.titre.toUpperCase(), x + sw/2, 244, { align: 'center' });
    doc.setFillColor(248, 249, 252); doc.setDrawColor(200, 207, 224);
    doc.roundedRect(x, 247, sw, 20, 1, 1, 'FD');
    doc.setDrawColor(13, 42, 94); doc.setLineWidth(1);
    doc.line(x+4, 267, x+sw-4, 267);
    doc.setFontSize(6); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text('Nom, Prénom & Signature', x + sw/2, 272, { align: 'center' });
  });

  // Ligne séparatrice dorée
  doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.5);
  doc.line(14, 276, W-14, 276);

  // ── PIED DE PAGE ──
  doc.setFillColor(26, 58, 110);
  doc.rect(8, 278, W-16, 19, 'F');
  doc.setTextColor(201, 168, 76); doc.setFontSize(8); doc.setFont('courier', 'bold');
  const ref = `PATRIS-PV-${new Date().getFullYear()}-${String(campagne.id || 1).padStart(4,'0')}-CT-LME`;
  doc.text(ref, 14, 286);
  doc.setTextColor(180, 200, 230); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — PATRIS ERP — Confidentiel`, 14, 292);
  doc.setTextColor(201, 168, 76); doc.setFontSize(7);
  doc.text('Vérifiez l\'authenticité sur patris.gouv.tg', W-14, 292, { align: 'right' });

  doc.save(`Certificat_Inventaire_${campagne.nom || 'PATRIS'}_${new Date().getFullYear()}.pdf`);
}

export async function exportGrandLivrePremiumExcel(
  biens: Array<Record<string, Primitive>>,
  filename: string,
  user?: ExportUser
) {
  await exportGrandLivreExcel(biens, filename, user);
}
