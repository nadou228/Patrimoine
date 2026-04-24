import { utils, writeFile } from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ExportUser {
  nom: string;
  prenom?: string;
  role?: string;
  posteComptable?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES GLOBAUX — injectés dans chaque document
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 10px; }
  table {
    border-collapse: collapse;
    font-family: 'Calibri', Arial, sans-serif;
    font-size: 10px;
    width: 100%;
  }
  td, th {
    border: 1.5px solid #000;
    padding: 4px 6px;
    vertical-align: middle;
    white-space: nowrap;
  }
  .no-border { border: none !important; }
  .bold      { font-weight: bold; }
  .center    { text-align: center; }
  .right     { text-align: right; }
  .left      { text-align: left; }

  /* Fonds */
  .bg-blue   { background-color: #BDD7EE; }
  .bg-grey   { background-color: #D9D9D9; }
  .bg-green  { background-color: #E2EFDA; }
  .bg-yellow { background-color: #FFF2CC; }
  .bg-light  { background-color: #F2F2F2; }
  .bg-white  { background-color: #FFFFFF; }

  /* En-tête de colonne standard */
  .th {
    background-color: #2F75B6;
    color: #FFFFFF;
    font-weight: bold;
    text-align: center;
    border: 1.5px solid #1A4F7A;
    padding: 5px 4px;
    font-size: 9px;
  }
  .th-light {
    background-color: #BDD7EE;
    color: #000;
    font-weight: bold;
    text-align: center;
    border: 1.5px solid #4472C4;
    padding: 5px 4px;
    font-size: 9px;
  }

  /* Titre principal du document */
  .doc-title {
    font-size: 13px;
    font-weight: bold;
    text-align: center;
    background-color: #2F75B6;
    color: #FFFFFF;
    padding: 8px;
    border: 2px solid #1A4F7A;
    letter-spacing: 0.5px;
  }

  /* Entête ministère */
  .header-left  { font-size: 10px; font-weight: bold; border: none; }
  .header-right { font-size: 10px; font-weight: bold; border: none; text-align: right; }
  .header-sub   { font-size: 10px; border: none; text-align: right; font-style: italic; }

  /* Lignes alternées */
  .row-odd  { background-color: #FFFFFF; }
  .row-even { background-color: #EBF3FB; }

  /* Total / sous-total */
  .row-subtotal { background-color: #D9E1F2; font-weight: bold; }
  .row-total    { background-color: #2F75B6; color: #FFFFFF; font-weight: bold; }

  /* Groupe compte matière */
  .row-group { background-color: #E2EFDA; font-weight: bold; font-size: 10px; }
`;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════════════════════════════

const YEAR = new Date().getFullYear();

function fmt(val: any, fallback = "-"): string {
  if (val === null || val === undefined || val === "") return fallback;
  return String(val);
}

function fmtNum(val: any): string {
  const n = Number(val);
  if (isNaN(n)) return "-";
  return n.toLocaleString("fr-FR");
}

function today(): string {
  return new Date().toLocaleDateString("fr-FR");
}

/** Entête REPUBLIQUE TOGOLAISE avec poste comptable dynamique */
function headerRT(cols: number, user?: ExportUser): string {
  const posteLabel = user?.posteComptable
    ? user.posteComptable
    : user?.nom
    ? `${user.prenom || ""} ${user.nom}`.trim()
    : "......................";
  const half = Math.ceil(cols / 2);
  const rest = cols - half;
  return `
  <tr>
    <td colspan="${half}" class="header-left">${user?.nom && user.nom !== '......................' ? user.nom : (user as any)?.ministere || "MINISTÈRE DE L'ÉCONOMIE ET DES FINANCES"}</td>
    <td colspan="${rest}" class="header-right" style="font-size:12px; font-weight:bold;">REPUBLIQUE TOGOLAISE</td>
  </tr>
  <tr>
    <td colspan="${half}" class="no-border" style="font-size:9px; font-style:italic;">Direction Générale du Patrimoine</td>
    <td colspan="${rest}" class="header-sub">Travail - Liberté - Patrie</td>
  </tr>
  <tr>
    <td colspan="${half}" class="header-left">POSTE COMPTABLE DE : ${posteLabel}</td>
    <td colspan="${rest}" class="header-right">Exercice budgétaire : ${YEAR}</td>
  </tr>
  <tr>
    <td colspan="${cols}" class="no-border" style="height:6px;"></td>
  </tr>`;
}

/** Zone de signatures avec boîtes et lignes */
function signatureBlock(signataires: { titre: string; nom?: string }[], cols: number): string {
  const colWidth = Math.floor(cols / signataires.length);
  const cells = signataires.map((s) => {
    const displayNom = s.nom ? s.nom : "..................................";
    return `
      <td colspan="${colWidth}" style="border:none; padding:6px 4px; vertical-align:top;">
        <table style="width:100%; border-collapse:collapse; font-family:Calibri,Arial,sans-serif;">
          <tr>
            <td style="border:none; font-weight:bold; text-align:center; font-size:10px; padding-bottom:4px;">
              ${s.titre}
            </td>
          </tr>
          <tr>
            <td style="border:1px solid #999; background:#FAFAFA; height:55px; vertical-align:bottom;
                       font-size:8px; text-align:center; padding:4px; color:#777;">
              Signature &amp; Cachet
            </td>
          </tr>
          <tr>
            <td style="border:none; padding-top:5px; font-size:9px; text-align:center;">
              <span style="font-weight:bold;">Nom &amp; Prénoms :</span> ${displayNom}
            </td>
          </tr>
        </table>
      </td>`;
  }).join("");

  return `
  <tr><td colspan="${cols}" class="no-border" style="height:12px;"></td></tr>
  <tr>
    <td colspan="${cols}" class="no-border"
        style="border-top:2px solid #2F75B6; padding:3px 0; font-size:9px; color:#2F75B6; font-style:italic;">
      Fait à .................... , le ${today()}
    </td>
  </tr>
  <tr>${cells}</tr>`;
}

function wrapHtml(colWidths: number[], body: string): string {
  const cols = colWidths.map((w) => `<col width="${w}">`).join("");
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
               xmlns:x="urn:schemas-microsoft-com:office:excel"
               xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8"/><style>${CSS}</style></head>
  <body>
    <table>${cols}${body}</table>
  </body>
  </html>`;
}

function downloadXls(html: string, filename: string) {
  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.replace(/\.xlsx?$/i, ".xls");
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. EXPORT XLSX GÉNÉRIQUE (données brutes)
// ═══════════════════════════════════════════════════════════════════════════════

export function exportXlsx<T extends Record<string, any>>(
  rows: T[],
  filename: string,
  sheetName = "Données"
) {
  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName);
  writeFile(wb, filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. REGISTRE DU PATRIMOINE (liste des biens)
// ═══════════════════════════════════════════════════════════════════════════════

export function exportRegistrePatrimoineExcel(biens: any[], filename: string, user?: ExportUser) {
  const colWidths = [28, 80, 70, 60, 60, 65, 70, 55, 65, 65, 50, 80];
  const N = colWidths.length;

  const rows = biens.map((b, i) => {
    const amort = b.amortissementCumule || 0;
    const vnc   = (b.valeur || 0) - amort;
    const cls   = i % 2 === 0 ? "row-odd" : "row-even";
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td class="center">${fmt(b.iup)}</td>
      <td>${fmt(b.designation)}</td>
      <td class="center">${fmt(b.categorie)}</td>
      <td class="center">${fmt(b.sousCategorie || b.type)}</td>
      <td class="center">${fmt(b.dateAcquisition)}</td>
      <td class="right">${fmtNum(b.valeur)}</td>
      <td class="center">${fmt(b.tauxAmortissement, "0")} %</td>
      <td class="right">${fmtNum(amort)}</td>
      <td class="right bg-light">${fmtNum(vnc)}</td>
      <td class="center">${fmt(b.etat, "ACTIF")}</td>
      <td>${fmt(b.localisation || b.service)}</td>
    </tr>`;
  }).join("");

  const totalVal   = biens.reduce((s, b) => s + (b.valeur || 0), 0);
  const totalAmort = biens.reduce((s, b) => s + (b.amortissementCumule || 0), 0);
  const totalVnc   = totalVal - totalAmort;

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">REGISTRE DU PATRIMOINE — LISTE DES BIENS</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>
  <tr>
    <td class="th">N°</td>
    <td class="th">IUP / Réf.</td>
    <td class="th">Désignation</td>
    <td class="th">Catégorie</td>
    <td class="th">Type</td>
    <td class="th">Date Acq.</td>
    <td class="th">Valeur Acq. (FCFA)</td>
    <td class="th">Taux Amort.</td>
    <td class="th">Amort. Cumulé (FCFA)</td>
    <td class="th">VNC (FCFA)</td>
    <td class="th">État</td>
    <td class="th">Localisation / Service</td>
  </tr>
  ${rows}
  <tr class="row-total">
    <td colspan="6" class="center bold">TOTAL GÉNÉRAL — ${biens.length} bien(s)</td>
    <td class="right bold">${fmtNum(totalVal)}</td>
    <td></td>
    <td class="right bold">${fmtNum(totalAmort)}</td>
    <td class="right bold">${fmtNum(totalVnc)}</td>
    <td colspan="2"></td>
  </tr>
  ${signatureBlock(
    [
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ORDRE D'ENTRÉE DE MATIÈRES
// ═══════════════════════════════════════════════════════════════════════════════

export function exportOrdreEntreeExcel(bien: any, filename: string, user?: ExportUser) {
  const colWidths = [28, 45, 55, 55, 35, 85, 38, 72, 72, 32, 38, 85];
  const N = colWidths.length;
  const montant = bien.valeur || 0;

  const body = `
  ${headerRT(N, user)}
  <tr>
    <td colspan="${N}" class="doc-title">
      ORDRE D'ENTRÉE DE MATIÈRES &nbsp;&nbsp; N° ............. &nbsp;&nbsp; Du ${fmt(bien.dateAcquisition)}
    </td>
  </tr>
  <tr><td colspan="${N}" class="no-border" style="height:8px;"></td></tr>

  <tr>
    <td colspan="3" class="th-light bold">FOURNISSEUR</td>
    <td colspan="3" class="th-light center">SOURCE DE FINANCEMENT</td>
    <td colspan="3" class="th-light center">MODE D'ACQUISITION</td>
    <td colspan="3" class="th-light center">OBSERVATIONS</td>
  </tr>
  <tr>
    <td colspan="3" rowspan="3" style="vertical-align:top; padding:6px;">${fmt(bien.fabricant, "...")}</td>
    <td colspan="3" class="center" rowspan="3">BUDGET ${YEAR}</td>
    <td colspan="3" class="center" rowspan="3">${fmt(bien.modeAcquisition, "PAR BON DE COMMANDE")}</td>
    <td colspan="3" class="center" rowspan="3">${fmt(bien.observation, "Dotation")}</td>
  </tr>
  <tr></tr><tr></tr>

  <tr>
    <td colspan="2" class="th-light center">TYPE DE PIÈCE</td>
    <td class="th-light center">RÉFÉRENCE</td>
    <td colspan="9" class="no-border"></td>
  </tr>
  <tr>
    <td colspan="2" class="center">Bon de Livraison (BL)</td>
    <td class="center">N° ..........</td>
    <td colspan="9" class="no-border"></td>
  </tr>
  <tr>
    <td colspan="2" class="center">Contrat / PV Réception</td>
    <td class="center">-</td>
    <td colspan="9" class="no-border"></td>
  </tr>

  <tr><td colspan="${N}" class="no-border" style="height:8px;"></td></tr>

  <tr>
    <td class="th" rowspan="2">N° d'ordre</td>
    <td class="th" rowspan="2">Compte matière</td>
    <td class="th" rowspan="2">Type de bien</td>
    <td class="th" rowspan="2">Marque / Modèle</td>
    <td class="th" rowspan="2">Unité</td>
    <td class="th" rowspan="2">Désignation</td>
    <td class="th" rowspan="2">Quantité</td>
    <td class="th" rowspan="2">Prix Unitaire (FCFA)</td>
    <td class="th" rowspan="2">Montant (FCFA)</td>
    <td colspan="2" class="th center">Amortissement</td>
    <td class="th" rowspan="2">Observations</td>
  </tr>
  <tr>
    <td class="th">O / N</td>
    <td class="th">Taux (%)</td>
  </tr>

  <tr class="row-odd">
    <td class="center">1</td>
    <td class="center">${fmt(bien.categorie)}</td>
    <td class="center">${fmt(bien.type || bien.categorie)}</td>
    <td class="center">${fmt(bien.marque || bien.immatriculation)}</td>
    <td class="center">U</td>
    <td>${fmt(bien.designation)}</td>
    <td class="center">1</td>
    <td class="right">${fmtNum(montant)}</td>
    <td class="right">${fmtNum(montant)}</td>
    <td class="center">O</td>
    <td class="center">${fmt(bien.tauxAmortissement, "-")}</td>
    <td>${fmt(bien.observation)}</td>
  </tr>
  <tr class="row-even"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
  <tr class="row-odd"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>

  <tr class="row-total">
    <td colspan="8" class="center bold">Valeur totale des entrées :</td>
    <td class="right bold">${fmtNum(montant)} FCFA</td>
    <td colspan="3"></td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Magasinier-Fichiste" },
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. BORDEREAU DE MUTATION DES MATIÈRES
// ═══════════════════════════════════════════════════════════════════════════════

export function exportBordereauMutationExcel(affectation: any, filename: string, user?: ExportUser) {
  const colWidths = [32, 75, 130, 75, 52, 110];
  const N = colWidths.length;

  const items: any[] = affectation.biens?.length
    ? affectation.biens
    : [{
        bienCode: (affectation.bien && (affectation.bien.iup || affectation.bien.codeBien)) || affectation.bienCode || "-",
        designation: affectation.bien?.designation || (typeof affectation.bien === 'string' ? affectation.bien : "Actif"),
        valeur: (affectation.bien && affectation.bien.valeur) || affectation.valeur || 0,
        etat: affectation.etat || (affectation.bien && affectation.bien.etat) || "ACTIF",
        motif: affectation.motif || "N/A",
      }];

  const iup = items[0]?.bienCode || "N/A";
  const dateStr = new Date(affectation.dateAffectation).toLocaleDateString();
  const mutationHash = `BM-${affectation.id || 'N'}-${iup}-${dateStr.replace(/\//g, '')}`;
  const qrData = encodeURIComponent(`Mutation PATRIS\nBordereau: ${mutationHash}\nIUP: ${iup}\nDétenteur: ${affectation.detenteur}\nDate: ${dateStr}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${qrData}`;

  const rows = items.map((b, i) => {
    const cls = i % 2 === 0 ? "row-odd" : "row-even";
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td class="center">${fmt(b.bienCode || b.codeBien || b.iup)}</td>
      <td>${fmt(b.designation || b.libelle)}</td>
      <td class="right">${fmtNum(b.valeur || b.valeurOrigine || 0)}</td>
      <td class="center">${fmt(b.etat, "ACTIF")}</td>
      <td>${fmt(b.motif || b.observations || "-")}</td>
    </tr>`;
  }).join("");

  const emptyRows = Array.from({ length: Math.max(0, 5 - items.length) }, (_, i) => `
    <tr class="${(items.length + i) % 2 === 0 ? "row-odd" : "row-even"}">
      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td>
    </tr>`).join("");

  const totalVal = items.reduce((s, b) => s + (b.valeur || 0), 0);

  const body = `
  ${headerRT(N, user)}
  <tr>
    <td colspan="${N}" class="doc-title">
      BORDEREAU DE MUTATION DES MATIÈRES &nbsp;&nbsp; N° ............. &nbsp;&nbsp; DU ${fmt(affectation.dateAffectation)}
    </td>
  </tr>
  <tr><td colspan="${N}" class="no-border" style="height:8px;"></td></tr>

  <tr>
    <td colspan="3" class="th-light center bold">ORIGINE</td>
    <td colspan="3" class="th-light center bold">DESTINATION</td>
  </tr>
  <tr>
    <td colspan="4" style="padding:6px; vertical-align:top;">
      <p style="margin:2px 0;"><span style="font-weight:bold;">Détenteur A (Cédant) :</span> ${fmt(affectation.detenteurA, ".........................")}</p>
      <p style="margin:10px 0 2px 0;"><span style="font-weight:bold;">Détenteur B (Preneur) :</span> ${fmt(affectation.detenteurB || affectation.detenteur)}</p>
      <p style="margin:2px 0;"><span style="font-weight:bold;">Service de Destination :</span> ${fmt(affectation.service)}</p>
    </td>
    <td colspan="2" class="center" style="vertical-align:middle; padding:10px;">
       <div style="font-size:8px; margin-bottom:4px; color:#2F75B6;">Vérification Numérique</div>
       <img src="${qrUrl}" width="65" height="65" style="border:1px solid #EEE;" />
       <div style="font-size:7px; margin-top:4px; font-family:monospace; color:#666;">ID: ${mutationHash.substring(0, 15)}</div>
    </td>
  </tr>

  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th">N° d'ordre</td>
    <td class="th">Code matricule / IUP</td>
    <td class="th">Désignation du bien</td>
    <td class="th">Valeur (FCFA)</td>
    <td class="th">État</td>
    <td class="th">Motif / Observations</td>
  </tr>

  ${rows}
  ${emptyRows}

  <tr class="row-subtotal">
    <td colspan="3" class="center bold">Nombre total de biens : ${items.length}</td>
    <td class="right bold">${fmtNum(totalVal)} FCFA</td>
    <td colspan="2" class="bold">Montant total en FCFA</td>
  </tr>

  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>
  <tr>
    <td colspan="${N}" style="font-size:8px; font-style:italic; border:1px dashed #999;
        background:#FFFDE7; padding:10px; position:relative;">
      <div style="float:right; opacity:0.15; font-size:25px; font-weight:bold; color:#2F75B6; transform:rotate(-15deg); text-transform:uppercase;">
         ${affectation.statutValidation === 'VALIDE' ? 'VERIFIE' : 'EN ATTENTE DE VALIDATION'}
      </div>
      &#9888; <span style="font-weight:bold;">CERTIFICATION :</span> Le présent bordereau engage la responsabilité civile et pécuniaire des deux détenteurs mentionnés ci-dessus. Tout mouvement de matériel doit être notifié au Service de la Comptabilité des Matières sous 48 heures ouvrables.
      <br/> <span style="font-size:7px; opacity:0.6;">Empreinte de sécurité : ${mutationHash} | Généré par Patris ERP</span>
    </td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Détenteur A", nom: fmt(affectation.detenteurA) },
      { titre: "Le Détenteur B", nom: fmt(affectation.detenteurB || affectation.detenteur) },
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. LIVRE JOURNAL DES IMMOBILISATIONS "A"
// ═══════════════════════════════════════════════════════════════════════════════

export function exportLivreJournalImmobilisationsExcel(biens: any[], filename: string, user?: ExportUser) {
  const colWidths = [28, 58, 62, 95, 40, 40, 68, 68, 68, 78, 85];
  const N = colWidths.length;

  let totalEntreeVal = 0;

  const rows = biens.map((b, i) => {
    const val = b.valeur || 0;
    totalEntreeVal += val;
    const cls = i % 2 === 0 ? "row-odd" : "row-even";
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td class="center">${fmt(b.dateAcquisition)}</td>
      <td class="center">${fmt(b.categorie)}</td>
      <td>${fmt(b.designation)}</td>
      <td class="center">1</td>
      <td class="center">—</td>
      <td class="right">${fmtNum(val)}</td>
      <td class="right bg-light">${fmtNum(val)}</td>
      <td class="center">—</td>
      <td class="center">${fmt(b.titreFoncier || b.immatriculation || b.numSerie)}</td>
      <td>${fmt(b.observation)}</td>
    </tr>`;
  }).join("");

  const emptyRows = Array.from({ length: Math.max(0, 5 - biens.length) }, (_, i) => `
    <tr class="${(biens.length + i) % 2 === 0 ? "row-odd" : "row-even"}">
      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`).join("");

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">LIVRE JOURNAL DES IMMOBILISATIONS "A"</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th" rowspan="2">N° d'ordre</td>
    <td class="th" rowspan="2">Date</td>
    <td colspan="2" class="th center">Matière</td>
    <td colspan="2" class="th center">Quantité</td>
    <td colspan="3" class="th center">Montant (FCFA)</td>
    <td class="th" rowspan="2">Pièces justificatives</td>
    <td class="th" rowspan="2">Observations</td>
  </tr>
  <tr>
    <td class="th">Compte</td>
    <td class="th">Désignation</td>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
    <td class="th">Coût unitaire</td>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
  </tr>

  ${rows}
  ${emptyRows}

  <tr class="row-total">
    <td colspan="6" class="center bold">TOTAL</td>
    <td class="right bold">${fmtNum(totalEntreeVal)}</td>
    <td class="right bold">${fmtNum(totalEntreeVal)}</td>
    <td class="center">—</td>
    <td colspan="2"></td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

export const exportLivreJournalExcel = exportLivreJournalImmobilisationsExcel;

// ═══════════════════════════════════════════════════════════════════════════════
// 6. LIVRE JOURNAL DES FOURNITURES ET CONSOMMABLES "B"
// ═══════════════════════════════════════════════════════════════════════════════

export function exportLivreJournalFournituresExcel(mouvements: any[], filename: string, user?: ExportUser) {
  const colWidths = [28, 58, 62, 95, 40, 40, 58, 68, 68, 78, 85];
  const N = colWidths.length;

  let tEQ = 0, tSQ = 0, tEV = 0, tSV = 0;

  const rows = mouvements.map((m, i) => {
    const isE = m.type === "ENTREE";
    const val = (m.qte || 0) * (m.pu || 0);
    if (isE) { tEQ += m.qte || 0; tEV += val; }
    else     { tSQ += m.qte || 0; tSV += val; }
    const cls = i % 2 === 0 ? "row-odd" : "row-even";
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td class="center">${fmt(m.date)}</td>
      <td class="center">${fmt(m.compte || m.categorie)}</td>
      <td>${fmt(m.designation || m.article)}</td>
      <td class="right">${isE ? fmtNum(m.qte) : ""}</td>
      <td class="right">${!isE ? fmtNum(m.qte) : ""}</td>
      <td class="right">${fmtNum(m.pu)}</td>
      <td class="right">${isE ? fmtNum(val) : ""}</td>
      <td class="right">${!isE ? fmtNum(val) : ""}</td>
      <td class="center">${fmt(m.piece)}</td>
      <td>${fmt(m.observations)}</td>
    </tr>`;
  }).join("");

  const emptyRows = Array.from({ length: Math.max(0, 5 - mouvements.length) }, (_, i) => `
    <tr class="${(mouvements.length + i) % 2 === 0 ? "row-odd" : "row-even"}">
      <td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
    </tr>`).join("");

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">LIVRE JOURNAL DES FOURNITURES ET CONSOMMABLES "B"</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th" rowspan="2">N°</td>
    <td class="th" rowspan="2">Date</td>
    <td colspan="2" class="th center">Matière</td>
    <td colspan="2" class="th center">Quantité</td>
    <td class="th" rowspan="2">Coût unitaire</td>
    <td colspan="2" class="th center">Montant (FCFA)</td>
    <td class="th" rowspan="2">Pièces just.</td>
    <td class="th" rowspan="2">Observations</td>
  </tr>
  <tr>
    <td class="th">Compte</td>
    <td class="th">Désignation</td>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
  </tr>

  ${rows}
  ${emptyRows}

  <tr class="row-total">
    <td colspan="4" class="center bold">TOTAL</td>
    <td class="right bold">${fmtNum(tEQ)}</td>
    <td class="right bold">${fmtNum(tSQ)}</td>
    <td></td>
    <td class="right bold">${fmtNum(tEV)}</td>
    <td class="right bold">${fmtNum(tSV)}</td>
    <td colspan="2"></td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. FICHE DE STOCK
// ═══════════════════════════════════════════════════════════════════════════════

export function exportFicheStockExcel(item: any, mouvements: any[], filename: string, user?: ExportUser) {
  const colWidths = [58, 78, 45, 52, 62, 45, 52, 62, 52, 68, 95];
  const N = colWidths.length;

  let stockQte = 0, stockVal = 0;

  const rows = mouvements.map((m, i) => {
    const isE = m.type === "ENTREE";
    const val = (m.qte || 0) * (m.pu || 0);
    if (isE) { stockQte += m.qte || 0; stockVal += val; }
    else     { stockQte -= m.qte || 0; stockVal -= val; }
    const cls = i % 2 === 0 ? "row-odd" : "row-even";
    return `
    <tr class="${cls}">
      <td class="center">${fmt(m.date)}</td>
      <td class="center">${fmt(m.piece)}</td>
      <td class="right">${isE ? fmtNum(m.qte) : ""}</td>
      <td class="right">${isE ? fmtNum(m.pu) : ""}</td>
      <td class="right">${isE ? fmtNum(val) : ""}</td>
      <td class="right">${!isE ? fmtNum(m.qte) : ""}</td>
      <td class="right">${!isE ? fmtNum(m.pu) : ""}</td>
      <td class="right">${!isE ? fmtNum(val) : ""}</td>
      <td class="right bold bg-light">${fmtNum(stockQte)}</td>
      <td class="right bold bg-light">${fmtNum(stockVal)}</td>
      <td>${fmt(m.observations)}</td>
    </tr>`;
  }).join("");

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">FICHE DE STOCK DES IMMOBILISATIONS</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:4px;"></td></tr>
  <tr>
    <td colspan="3" class="th-light bold">Code Matière : ${fmt(item.id)}</td>
    <td colspan="5" class="th-light center bold">Désignation : ${fmt(item.article || item.designation)}</td>
    <td colspan="3" class="th-light center bold">Unité : ${fmt(item.unite)}</td>
  </tr>
  <tr><td colspan="${N}" class="no-border" style="height:4px;"></td></tr>

  <tr>
    <td class="th" rowspan="2">Date</td>
    <td class="th" rowspan="2">Pièces justificatives</td>
    <td colspan="3" class="th center">Entrée</td>
    <td colspan="3" class="th center">Sortie</td>
    <td colspan="2" class="th center">Stock</td>
    <td class="th" rowspan="2">Observations</td>
  </tr>
  <tr>
    <td class="th">Qté</td><td class="th">PU</td><td class="th">Valeur</td>
    <td class="th">Qté</td><td class="th">PU</td><td class="th">Valeur</td>
    <td class="th">Qté</td><td class="th">Valeur</td>
  </tr>

  ${rows}

  <tr class="row-total">
    <td colspan="8" class="center bold">SOLDE FINAL</td>
    <td class="right bold">${fmtNum(stockQte)}</td>
    <td class="right bold">${fmtNum(stockVal)}</td>
    <td></td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Magasinier-Fichiste" },
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. GRAND LIVRE DES IMMOBILISATIONS "A"
// ═══════════════════════════════════════════════════════════════════════════════

export function exportGrandLivreExcel(biens: any[], filename: string, user?: ExportUser) {
  const colWidths = [58, 82, 45, 45, 52, 68, 68, 105];
  const N = colWidths.length;

  const grouped: Record<string, any[]> = {};
  biens.forEach(b => {
    const k = b.categorie || "NON CLASSÉ";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(b);
  });

  let rowsHtml = "";
  let gQ = 0, gV = 0;

  Object.keys(grouped).forEach(compte => {
    let sQ = 0, sV = 0;

    rowsHtml += `
    <tr class="row-group">
      <td colspan="${N}" style="padding-left:8px;">&#9658; Compte matière : ${compte}</td>
    </tr>`;

    grouped[compte].forEach((b, i) => {
      sQ += 1;
      sV += b.valeur || 0;
      const cls = i % 2 === 0 ? "row-odd" : "row-even";
      rowsHtml += `
      <tr class="${cls}">
        <td class="center">${fmt(b.dateAcquisition)}</td>
        <td class="center">${fmt(b.titreFoncier || b.immatriculation || b.numSerie)}</td>
        <td class="right">1</td>
        <td class="right">—</td>
        <td class="right bold">${fmtNum(sQ)}</td>
        <td class="right">${fmtNum(b.valeur)}</td>
        <td class="right bold bg-light">${fmtNum(sV)}</td>
        <td>${fmt(b.designation)}</td>
      </tr>`;
    });

    gQ += sQ; gV += sV;

    rowsHtml += `
    <tr class="row-subtotal">
      <td colspan="4" class="right bold">Solde compte ${compte}</td>
      <td class="right bold">${fmtNum(sQ)}</td>
      <td></td>
      <td class="right bold">${fmtNum(sV)}</td>
      <td></td>
    </tr>
    <tr><td colspan="${N}" class="no-border" style="height:5px;"></td></tr>`;
  });

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">GRAND LIVRE DES IMMOBILISATIONS "A"</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th" rowspan="2">Date</td>
    <td class="th" rowspan="2">Pièces justificatives</td>
    <td colspan="3" class="th center">Quantité</td>
    <td colspan="2" class="th center">Valeur (FCFA)</td>
    <td class="th" rowspan="2">Désignation / Réf.</td>
  </tr>
  <tr>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
    <td class="th">Solde</td>
    <td class="th">Unitaire</td>
    <td class="th">Solde</td>
  </tr>

  ${rowsHtml}

  <tr class="row-total">
    <td colspan="4" class="center bold">TOTAL GÉNÉRAL</td>
    <td class="right bold">${fmtNum(gQ)}</td>
    <td></td>
    <td class="right bold">${fmtNum(gV)}</td>
    <td></td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. GRAND LIVRE DES FOURNITURES "B"
// ═══════════════════════════════════════════════════════════════════════════════

export function exportGrandLivreFournituresExcel(mouvements: any[], filename: string, user?: ExportUser) {
  const colWidths = [58, 82, 95, 45, 45, 52, 58, 68, 68];
  const N = colWidths.length;

  const grouped: Record<string, any[]> = {};
  mouvements.forEach(m => {
    const k = m.compte || m.categorie || "NON CLASSÉ";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(m);
  });

  let rowsHtml = "";
  let gEQ = 0, gSQ = 0, gEV = 0, gSV = 0;

  Object.keys(grouped).forEach(compte => {
    let eQ = 0, sQ = 0, eV = 0, sV = 0;

    rowsHtml += `
    <tr class="row-group">
      <td colspan="${N}" style="padding-left:8px;">&#9658; Compte matière : ${compte}</td>
    </tr>`;

    grouped[compte].forEach((m, i) => {
      const isE = m.type === "ENTREE";
      const val = (m.qte || 0) * (m.pu || 0);
      if (isE) { eQ += m.qte || 0; eV += val; }
      else     { sQ += m.qte || 0; sV += val; }
      const cls = i % 2 === 0 ? "row-odd" : "row-even";
      rowsHtml += `
      <tr class="${cls}">
        <td class="center">${fmt(m.date)}</td>
        <td class="center">${fmt(m.piece)}</td>
        <td>${fmt(m.designation || m.article)}</td>
        <td class="right">${isE ? fmtNum(m.qte) : ""}</td>
        <td class="right">${!isE ? fmtNum(m.qte) : ""}</td>
        <td class="right bold">${fmtNum(eQ - sQ)}</td>
        <td class="right">${fmtNum(m.pu)}</td>
        <td class="right bg-light">${isE ? fmtNum(val) : ""}</td>
        <td class="right bg-light">${!isE ? fmtNum(val) : ""}</td>
      </tr>`;
    });

    gEQ += eQ; gSQ += sQ; gEV += eV; gSV += sV;

    rowsHtml += `
    <tr class="row-subtotal">
      <td colspan="3" class="right bold">Solde compte ${compte}</td>
      <td class="right bold">${fmtNum(eQ)}</td>
      <td class="right bold">${fmtNum(sQ)}</td>
      <td class="right bold">${fmtNum(eQ - sQ)}</td>
      <td></td>
      <td class="right bold">${fmtNum(eV)}</td>
      <td class="right bold">${fmtNum(sV)}</td>
    </tr>
    <tr><td colspan="${N}" class="no-border" style="height:5px;"></td></tr>`;
  });

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">GRAND LIVRE DES FOURNITURES ET CONSOMMABLES "B"</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th" rowspan="2">Date</td>
    <td class="th" rowspan="2">Pièces just.</td>
    <td class="th" rowspan="2">Désignation</td>
    <td colspan="3" class="th center">Quantité</td>
    <td class="th" rowspan="2">Coût unitaire</td>
    <td colspan="2" class="th center">Montant (FCFA)</td>
  </tr>
  <tr>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
    <td class="th">Solde</td>
    <td class="th">Entrée</td>
    <td class="th">Sortie</td>
  </tr>

  ${rowsHtml}

  <tr class="row-total">
    <td colspan="3" class="center bold">TOTAL GÉNÉRAL</td>
    <td class="right bold">${fmtNum(gEQ)}</td>
    <td class="right bold">${fmtNum(gSQ)}</td>
    <td class="right bold">${fmtNum(gEQ - gSQ)}</td>
    <td></td>
    <td class="right bold">${fmtNum(gEV)}</td>
    <td class="right bold">${fmtNum(gSV)}</td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. PROCÈS-VERBAL DE RECENSEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function exportPvRecensementExcel(recensement: any, filename: string, user?: ExportUser) {
  const colWidths = [32, 62, 125, 68, 72, 52, 85, 95];
  const N = colWidths.length;

  const items: any[] = recensement.biens || [];
  const rows = items.map((b, i) => {
    const cls = i % 2 === 0 ? "row-odd" : "row-even";
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td class="center">${fmt(b.iup || b.numSerie)}</td>
      <td>${fmt(b.designation)}</td>
      <td class="center">${fmt(b.categorie)}</td>
      <td class="right">${fmtNum(b.valeur)}</td>
      <td class="center">${fmt(b.etat, "BON")}</td>
      <td class="center">${fmt(b.localisation)}</td>
      <td>${fmt(b.observations)}</td>
    </tr>`;
  }).join("");

  const totalVal = items.reduce((s, b) => s + (b.valeur || 0), 0);
  const commission: { titre: string; nom?: string }[] =
    (recensement.commission || []).map((m: string) => ({ titre: m }));
  if (commission.length === 0) {
    commission.push(
      { titre: "Le Président de la Commission" },
      { titre: "Membre 1" },
      { titre: "Membre 2" }
    );
  }

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">PROCÈS-VERBAL DE RECENSEMENT DES BIENS</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td colspan="4" class="th-light bold">Date du recensement : ${fmt(recensement.date, today())}</td>
    <td colspan="4" class="th-light bold">Lieu : ${fmt(recensement.lieu)}</td>
  </tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th">N°</td>
    <td class="th">Code / IUP</td>
    <td class="th">Désignation</td>
    <td class="th">Catégorie</td>
    <td class="th">Valeur (FCFA)</td>
    <td class="th">État</td>
    <td class="th">Localisation</td>
    <td class="th">Observations</td>
  </tr>

  ${rows}

  <tr class="row-total">
    <td colspan="4" class="center bold">TOTAL — ${items.length} bien(s) recensé(s)</td>
    <td class="right bold">${fmtNum(totalVal)} FCFA</td>
    <td colspan="3"></td>
  </tr>

  <tr><td colspan="${N}" class="no-border" style="height:8px;"></td></tr>
  <tr>
    <td colspan="${N}" class="no-border"
        style="font-style:italic; font-size:9px; padding:4px 0;">
      Composition de la Commission de Recensement :
    </td>
  </tr>

  ${signatureBlock(commission.slice(0, 4), N)}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. ÉTAT RÉCAPITULATIF DES IMMOBILISATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function exportEtatRecapitulatifExcel(biens: any[], filename: string, user?: ExportUser) {
  const colWidths = [28, 68, 115, 68, 72, 42, 78, 72];
  const N = colWidths.length;

  const grouped: Record<string, any[]> = {};
  biens.forEach(b => {
    const k = b.categorie || "NON CLASSÉ";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(b);
  });

  let rowsHtml = "";
  let gV = 0, gA = 0, gVnc = 0;

  Object.keys(grouped).forEach(cat => {
    let catV = 0, catA = 0, catVnc = 0;

    rowsHtml += `
    <tr class="row-group">
      <td colspan="${N}" style="padding-left:8px;">&#9658; ${cat}</td>
    </tr>`;

    grouped[cat].forEach((b, i) => {
      const amort = b.amortissementCumule || 0;
      const vnc   = (b.valeur || 0) - amort;
      catV += b.valeur || 0; catA += amort; catVnc += vnc;
      const cls = i % 2 === 0 ? "row-odd" : "row-even";
      rowsHtml += `
      <tr class="${cls}">
        <td class="center">${i + 1}</td>
        <td class="center">${fmt(b.iup)}</td>
        <td>${fmt(b.designation)}</td>
        <td class="center">${fmt(b.dateAcquisition)}</td>
        <td class="right">${fmtNum(b.valeur)}</td>
        <td class="center">${fmt(b.tauxAmortissement, "0")} %</td>
        <td class="right">${fmtNum(amort)}</td>
        <td class="right bg-light">${fmtNum(vnc)}</td>
      </tr>`;
    });

    gV += catV; gA += catA; gVnc += catVnc;

    rowsHtml += `
    <tr class="row-subtotal">
      <td colspan="4" class="right bold">Sous-total ${cat}</td>
      <td class="right bold">${fmtNum(catV)}</td>
      <td></td>
      <td class="right bold">${fmtNum(catA)}</td>
      <td class="right bold">${fmtNum(catVnc)}</td>
    </tr>
    <tr><td colspan="${N}" class="no-border" style="height:5px;"></td></tr>`;
  });

  const body = `
  ${headerRT(N, user)}
  <tr><td colspan="${N}" class="doc-title">ÉTAT RÉCAPITULATIF DES IMMOBILISATIONS</td></tr>
  <tr><td colspan="${N}" class="no-border" style="height:6px;"></td></tr>

  <tr>
    <td class="th">N°</td>
    <td class="th">IUP / Réf.</td>
    <td class="th">Désignation</td>
    <td class="th">Date Acquisition</td>
    <td class="th">Valeur Acq. (FCFA)</td>
    <td class="th">Taux Amort.</td>
    <td class="th">Amort. Cumulé (FCFA)</td>
    <td class="th">VNC (FCFA)</td>
  </tr>

  ${rowsHtml}

  <tr class="row-total">
    <td colspan="4" class="center bold">TOTAL GÉNÉRAL — ${biens.length} bien(s)</td>
    <td class="right bold">${fmtNum(gV)}</td>
    <td></td>
    <td class="right bold">${fmtNum(gA)}</td>
    <td class="right bold">${fmtNum(gVnc)}</td>
  </tr>

  ${signatureBlock(
    [
      { titre: "Le Comptable des Matières", nom: user ? `${user.prenom || ""} ${user.nom}`.trim() : undefined },
      { titre: "L'Ordonnateur des Matières" },
    ],
    N
  )}`;

  downloadXls(wrapHtml(colWidths, body), filename);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. RAPPORT D'INVENTAIRE COMPLET (XLS) — Campagne + Fiches + Écarts
// ═══════════════════════════════════════════════════════════════════════════════

export function exportInventaireCompletExcel(campagne: any, fiches: any[], ecarts: any[]) {
  // Campagne metadata
  const nomCampagne = campagne?.nom || "Inventaire";
  const site        = campagne?.sites || "National";
  const equipes     = campagne?.equipes || "—";
  const dateDebut   = campagne?.dateDebut || "—";
  const dateFin     = campagne?.dateFin || "—";
  const statut      = campagne?.statut || "—";

  // KPIs
  const total          = fiches.length;
  const scannes        = fiches.filter(f => f.validationAgent === "VALIDE").length;
  const anomalies      = fiches.filter(f => f.anomalie).length;
  const supValides     = fiches.filter(f => f.validationSuperviseur === "VALIDE").length;
  const ecartsTotal    = ecarts.length;
  const ecartsResolus  = ecarts.filter(e => e.statutValidation === "VALIDE").length;
  const progressPct    = total ? Math.round((scannes / total) * 100) : 0;

  // ECARTS STATUS COLORS
  const ecartStatusCls = (s: string) => s === "VALIDE" ? "row-even" : "row-odd";

  /* ── Column widths ── */
  const N_FICHE  = 11;
  const N_ECART  = 6;
  const colFiche  = [32, 90, 58, 48, 75, 75, 75, 45, 65, 65, 110];
  const colEcart  = [42, 95, 72, 105, 72, 95];

  /* ── Fiche rows ── */
  const ficheRows = fiches.map((f, i) => {
    const cls = i % 2 === 0 ? "row-odd" : "row-even";
    const anomCls = f.anomalie ? "style=\"color:#C00000;font-weight:bold;\"" : "";
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td class="center">${fmt(f.bien?.iup || f.codeIup)}</td>
      <td>${fmt(f.bien?.designation)}</td>
      <td class="center">${fmt(f.bien?.categorie)}</td>
      <td>${fmt(f.bien?.localisation)}</td>
      <td>${fmt(f.localisationReelle)}</td>
      <td class="center">${fmt(f.etatConstate)}</td>
      <td class="center" ${anomCls}>${f.anomalie ? "OUI" : "NON"}</td>
      <td class="center">${fmt(f.validationAgent)}</td>
      <td class="center">${fmt(f.validationSuperviseur)}</td>
      <td>${fmt(f.observation)}</td>
    </tr>`;
  }).join("");

  /* ── Ecart rows ── */
  const ecartRows = ecarts.map((e, i) => {
    const cls = ecartStatusCls(e.statutValidation);
    return `
    <tr class="${cls}">
      <td class="center">${i + 1}</td>
      <td>${fmt(e.bien?.designation)}</td>
      <td class="center">${fmt(e.bien?.iup)}</td>
      <td class="center">${fmt(e.typeEcart)?.replace(/_/g, " ")}</td>
      <td class="center">${fmt(e.statutValidation)}</td>
      <td>${fmt(e.justification)}</td>
    </tr>`;
  }).join("");

  /* ── KPI Summary Bar ── */
  const kpiBlock = `
  <tr><td colspan="${N_FICHE}" class="no-border" style="height:8px;"></td></tr>
  <tr>
    <td colspan="2" class="th-light center"><small>Avancement</small><br/><b>${progressPct}%</b></td>
    <td colspan="2" class="th-light center"><small>Actifs Audités</small><br/><b>${scannes} / ${total}</b></td>
    <td colspan="2" class="th-light center"><small>Anomalies</small><br/><b style="color:#C00000">${anomalies}</b></td>
    <td colspan="2" class="th-light center"><small>Sup. Validés</small><br/><b>${supValides}</b></td>
    <td colspan="3" class="th-light center"><small>Écarts Résolus</small><br/><b>${ecartsResolus} / ${ecartsTotal}</b></td>
  </tr>
  <tr><td colspan="${N_FICHE}" class="no-border" style="height:8px;"></td></tr>`;

  /* ── Body ── */
  const body = `
  ${headerRT(N_FICHE)}
  <tr><td colspan="${N_FICHE}" class="doc-title">RAPPORT D'INVENTAIRE PHYSIQUE CERTIFIÉ — ${nomCampagne.toUpperCase()}</td></tr>

  <!-- INFOS CAMPAGNE -->
  <tr><td colspan="${N_FICHE}" class="no-border" style="height:5px;"></td></tr>
  <tr>
    <td colspan="3" class="th-light bold">Site / Périmètre : ${site}</td>
    <td colspan="4" class="th-light bold center">Équipes : ${equipes}</td>
    <td colspan="4" class="th-light right">Statut : ${statut} &nbsp;|&nbsp; Du ${dateDebut} au ${dateFin}</td>
  </tr>

  <!-- KPIs -->
  ${kpiBlock}

  <!-- ═══ SECTION 1 : FICHES D'AUDIT TERRAIN ═══ -->
  <tr><td colspan="${N_FICHE}" class="row-group" style="font-size:11px;">▶ SECTION 1 — FICHES D'AUDIT TERRAIN (${total} actif(s))</td></tr>
  <tr>
    <td class="th">N°</td>
    <td class="th">IUP / Code</td>
    <td class="th">Désignation</td>
    <td class="th">Catégorie</td>
    <td class="th">Localisation Référentiel</td>
    <td class="th">Localisation Réelle</td>
    <td class="th">État Constaté</td>
    <td class="th">Anomalie</td>
    <td class="th">Valid. Agent</td>
    <td class="th">Valid. Superviseur</td>
    <td class="th">Observation</td>
  </tr>
  ${ficheRows}
  <tr class="row-total">
    <td colspan="7" class="center bold">TOTAL ACTIFS AUDITÉS</td>
    <td colspan="2" class="center bold">${scannes} scannés</td>
    <td colspan="2" class="center bold">${anomalies} anomalie(s)</td>
  </tr>

  <!-- ═══ SECTION 2 : ÉCARTS ═══ -->
  <tr><td colspan="${N_FICHE}" class="no-border" style="height:12px;"></td></tr>
  <tr><td colspan="${N_FICHE}" class="row-group" style="font-size:11px;">▶ SECTION 2 — ÉCARTS PATRIMONIAUX ET DÉCISIONS (${ecartsTotal} écart(s))</td></tr>
  <tr>
    <td class="th">N°</td>
    <td class="th">Bien</td>
    <td class="th">IUP</td>
    <td class="th">Type d'Écart</td>
    <td class="th">Statut Validation</td>
    <td class="th" colspan="6">Justification / Décision</td>
  </tr>
  ${ecartRows}
  <tr class="row-total">
    <td colspan="4" class="center bold">TOTAL ÉCARTS</td>
    <td class="center bold">${ecartsResolus} résolu(s)</td>
    <td colspan="6" class="center bold">${ecartsTotal - ecartsResolus} en attente</td>
  </tr>

  ${signatureBlock([
    { titre: "L'Agent Comptable des Matières" },
    { titre: "Le Superviseur d'Audit" },
    { titre: "L'Ordonnateur des Matières" }
  ], N_FICHE)}`;

  downloadXls(wrapHtml(colFiche, body),
    `Rapport_Inventaire_Complet_${nomCampagne.replace(/\s+/g,"_")}_${today().replace(/\//g,"-")}.xls`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. PROCÈS-VERBAL D'INVENTAIRE CERTIFIÉ (PDF PROFESSIONNEL)
// ═══════════════════════════════════════════════════════════════════════════════

export function exportPvInventaireCertifie(campagne: any, fiches: any[], ecarts: any[]) {
  const doc = new jsPDF({ orientation: "portrait", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Entête
  doc.setFontSize(10);
  doc.text("REPUBLIQUE TOGOLAISE", 15, 15);
  doc.setFontSize(8);
  doc.text("Travail - Liberté - Patrie", 15, 19);
  
  doc.setFontSize(22);
  doc.setTextColor(47, 117, 182);
  doc.text("PATRIS", W - 45, 20);

  doc.setDrawColor(47, 117, 182);
  doc.setLineWidth(1);
  doc.line(15, 30, W - 15, 30);
  
  doc.setFontSize(16);
  doc.text("PROCÈS-VERBAL D'INVENTAIRE CERTIFIÉ", W/2, 40, { align: "center" });

  // Sceau (Simulation visuelle avec cercle vert)
  doc.setDrawColor(32, 128, 0);
  doc.setLineWidth(1);
  doc.circle(W - 40, 60, 18);
  doc.setFontSize(8);
  doc.setTextColor(32, 128, 0);
  doc.text("CERTIFIÉ", W-40, 58, {align:"center"});
  doc.text("OFFICIEL", W-40, 63, {align:"center"});

  // Infos
  doc.setTextColor(0,0,0);
  doc.setFontSize(11);
  doc.text(`Mission : ${campagne.nom}`, 15, 55);
  doc.text(`Périmètre : ${campagne.sites || 'National'}`, 15, 62);
  doc.text(`Date : ${new Date().toLocaleDateString()}`, 15, 69);

  // Stats
  doc.setFillColor(240, 240, 240);
  doc.rect(15, 75, W-30, 20, "F");
  doc.setFontSize(9);
  doc.text(`Total Audités : ${fiches.length} | Anomalies : ${fiches.filter(f => f.anomalie).length} | Écarts : ${ecarts.length}`, 20, 87);

  // Tableau
  const body = ecarts.map(e => [e.bien?.iup, e.typeEcart, e.justification || "N/A", "RÉGULARISÉ"]);
  autoTable(doc, {
    startY: 100,
    head: [["IUP", "TYPE ÉCART", "JUSTIFICATION", "DÉCISION"]],
    body: body,
    theme: "grid",
    headStyles: { fillColor: [47, 117, 182] }
  });

  // QR
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=CERTIFIED_${campagne.id}`;
  doc.addImage(qrUrl, "PNG", W/2 - 15, H - 40, 30, 30);

  doc.save(`PV_INVENTAIRE_${campagne.id}.pdf`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. EXPORT PDF GÉNÉRIQUE (jsPDF + autoTable)
// ═══════════════════════════════════════════════════════════════════════════════

export function exportPdf(
  data: any[],
  title: string,
  filename: string,
  user?: ExportUser,
  extraContent?: { label: string; value: string }[]
) {
  if (!data || data.length === 0) return;

  const doc = new jsPDF({ orientation: "landscape", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Bandeau bleu entête
  doc.setFillColor(47, 117, 182);
  doc.rect(0, 0, W, 22, "F");

  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.text("REPUBLIQUE TOGOLAISE", W / 2, 9, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Travail - Liberté - Patrie", W / 2, 15, { align: "center" });

  // Titre du rapport
  doc.setFontSize(13);
  doc.setTextColor(47, 117, 182);
  doc.setFont("helvetica", "bold");
  doc.text(title, W / 2, 32, { align: "center" });

  // Méta
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.setFont("helvetica", "normal");
  const poste  = user?.posteComptable ? `Poste : ${user.posteComptable}   ` : "";
  const uName  = user ? `Généré par : ${user.prenom || ""} ${user.nom}`.trim() : "";
  doc.text(`${poste}Généré le : ${new Date().toLocaleString("fr-FR")}   ${uName}`, 14, 40);

  doc.setDrawColor(47, 117, 182);
  doc.setLineWidth(0.4);
  doc.line(14, 42, W - 14, 42);

  let startY = 48;

  // KPIs
  if (extraContent && extraContent.length > 0) {
    doc.setFillColor(235, 243, 252);
    doc.roundedRect(14, 44, W - 28, 14, 2, 2, "F");
    const step = (W - 28) / extraContent.length;
    extraContent.forEach((item, i) => {
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(47, 117, 182);
      doc.text(`${item.label} :`, 17 + i * step, 52);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(item.value, 17 + i * step + doc.getTextWidth(`${item.label} : `), 52);
    });
    startY = 62;
  }

  // Tableau
  autoTable(doc, {
    startY,
    head: [Object.keys(data[0])],
    body: data.map((obj) => Object.values(obj) as any[]),
    theme: "grid",
    headStyles: {
      fillColor: [47, 117, 182],
      textColor: 255,
      fontSize: 8,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: { fontSize: 7.5, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [235, 243, 252] },
    margin: { left: 14, right: 14 },
    didDrawPage: (hookData) => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${hookData.pageNumber} / ${totalPages}  —  ${title}`,
        W / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    },
  });

  doc.save(filename);
}

export function exportLivreJournalPremiumExcel(biens: any[], filename: string, user?: ExportUser) {
  const rows = [...biens]
    .sort((a, b) => String(a.dateAcquisition || "").localeCompare(String(b.dateAcquisition || "")))
    .map((bien, index) => ({
      ordre: index + 1,
      date: fmt(bien.dateAcquisition),
      reference: fmt(bien.codeSousCategorie || bien.codeBien || bien.iup),
      famille: fmt(bien.categoriePrincipale || bien.categorie),
      designation: fmt(bien.designation),
      quantiteEntree: fmtNum(bien.quantite || 1),
      quantiteSortie: "0",
      valeurEntree: fmtNum(bien.valeur),
      valeurSortie: "0",
      service: fmt(bien.service || bien.localisation),
      piece: fmt(bien.titreFoncier || bien.immatriculation || bien.numSerie || bien.iup),
    }));

  const totalValeur = biens.reduce((sum, bien) => sum + Number(bien.valeur || 0), 0);
  const totalQuantite = biens.reduce((sum, bien) => sum + Number(bien.quantite || 1), 0);
  const extra = [
    { label: "Total biens", value: fmtNum(biens.length) },
    { label: "Quantité comptable", value: fmtNum(totalQuantite) },
    { label: "Montant total", value: `${fmtNum(totalValeur)} FCFA` },
  ];

  exportPdf(rows, 'Livre Journal Premium des Immobilisations', filename.replace(/\.xls$/i, ".pdf"), user, extra);
  exportXlsx(rows, filename.replace(/\.pdf$/i, ".xlsx"), "Livre journal premium");
}

export function exportGrandLivrePremiumExcel(biens: any[], filename: string, user?: ExportUser) {
  const grouped = biens.reduce((acc: Record<string, any[]>, bien) => {
    const key = bien.codeFamille || bien.categorie || "NON CLASSE";
    if (!acc[key]) acc[key] = [];
    acc[key].push(bien);
    return acc;
  }, {});

  const rows: Record<string, any>[] = [];
  Object.entries(grouped).forEach(([compte, items]) => {
    let soldeQuantite = 0;
    let soldeValeur = 0;
    (items as any[])
      .sort((a, b) => String(a.dateAcquisition || "").localeCompare(String(b.dateAcquisition || "")))
      .forEach((bien: any) => {
        const quantite = Number(bien.quantite || 1);
        const valeur = Number(bien.valeur || 0);
        soldeQuantite += quantite;
        soldeValeur += valeur;
        rows.push({
          compte,
          famille: fmt(bien.familleCatalogue || bien.categoriePrincipale || bien.categorie),
          date: fmt(bien.dateAcquisition),
          reference: fmt(bien.codeSousCategorie || bien.iup),
          designation: fmt(bien.designation),
          entreeQte: fmtNum(quantite),
          sortieQte: "0",
          soldeQte: fmtNum(soldeQuantite),
          entreeValeur: fmtNum(valeur),
          sortieValeur: "0",
          soldeValeur: fmtNum(soldeValeur),
          localisation: fmt(bien.localisation || bien.service),
        });
      });
    rows.push({
      compte,
      famille: "SOUS-TOTAL",
      date: "",
      reference: "",
      designation: `Sous-total ${compte}`,
      entreeQte: "",
      sortieQte: "",
      soldeQte: fmtNum(soldeQuantite),
      entreeValeur: "",
      sortieValeur: "",
      soldeValeur: fmtNum(soldeValeur),
      localisation: "",
    });
  });

  const extra = [
    { label: "Comptes suivis", value: fmtNum(Object.keys(grouped).length) },
    { label: "Lignes produites", value: fmtNum(rows.length) },
    { label: "Date d'édition", value: today() },
  ];

  exportPdf(rows, 'Grand Livre Premium des Immobilisations', filename.replace(/\.xls$/i, ".pdf"), user, extra);
  exportXlsx(rows, filename.replace(/\.pdf$/i, ".xlsx"), "Grand livre premium");
}
