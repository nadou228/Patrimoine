import jsPDF from 'jspdf';
import 'jspdf-autotable';

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('fr-FR');
};

const formatMoney = (value?: number) => value != null ? `${Math.round(value).toLocaleString('fr-FR')} FCFA` : '—';

const drawDocumentHeader = (doc: jsPDF, title: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('MINISTERE/INSTITUTION', 40, 48);
  doc.text('REPUBLIQUE TOGOLAISE', pageWidth - 40, 48, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Travail-Liberté-Patrie', pageWidth / 2, 64, { align: 'center' });
  doc.setLineWidth(0.8);
  doc.line(40, 72, pageWidth - 40, 72);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 96, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date d'édition : ${formatDate(new Date().toISOString())}`, 40, 112);
};

const drawSignatureBlock = async (doc: jsPDF, yStart: number, signerName?: string, signatureDataUrl?: string) => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Date et signature', 40, yStart);
  doc.setLineWidth(0.7);
  doc.line(40, yStart + 20, 240, yStart + 20);
  doc.setFont('helvetica', 'normal');
  doc.text(signerName || 'Nom du validateur', 40, yStart + 36);
  if (signatureDataUrl) {
    try {
      doc.addImage(signatureDataUrl, 'PNG', 320, yStart - 10, 200, 60);
    } catch (error) {
      // ignore image errors
    }
  }
};

const appendDetailsTable = (doc: jsPDF, rows: [string, string][], startY: number) => {
  doc.autoTable({
    startY,
    head: [['Champ', 'Détails']],
    body: rows,
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [230, 230, 230], textColor: [20, 20, 20], halign: 'center' },
    theme: 'grid',
    columnStyles: { 0: { cellWidth: 140, fontStyle: 'bold' }, 1: { cellWidth: 360 } },
  });
  return doc.lastAutoTable.finalY + 12;
};

export async function generateAffectationPdf(affectation: any, bien: any, options?: { signerName?: string; signatureDataUrl?: string }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  drawDocumentHeader(doc, "BORDEREAU D'AFFECTATION");

  const rows: [string, string][] = [
    ['Bien', bien?.designation || '—'],
    ['IUP / Référence', bien?.iup || bien?.id || '—'],
    ['Catégorie', bien?.categorie || '—'],
    ['Service', affectation?.service || affectation?.services?.nomService || '—'],
    ['Détenteur', affectation?.detenteur || affectation?.beneficiaire?.nom || '—'],
    ["Date d'affectation", formatDate(affectation?.dateAffectation)],
    ['Motif / Fonction', affectation?.fonction || affectation?.motif || '—'],
  ];

  let y = appendDetailsTable(doc, rows, 130);

  const docs = affectation?.documentsUrls || [];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Documents joints', 40, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 18;
  if (!docs.length) {
    doc.text('Aucun document attaché.', 40, y);
    y += 18;
  } else {
    docs.forEach((d: string) => {
      const text = `• ${d}`;
      doc.text(text, 50, y);
      y += 16;
    });
  }

  y = Math.max(y + 40, 460);
  await drawSignatureBlock(doc, y, options?.signerName, options?.signatureDataUrl);
  doc.setFontSize(9);
  doc.text('Document généré par le système de gestion du patrimoine.', 40, doc.internal.pageSize.getHeight() - 40);
  return doc.output('blob');
}

export async function generateReformePdf(reforme: any, bien: any, options?: { signerName?: string; signatureDataUrl?: string }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  drawDocumentHeader(doc, 'PROCES VERBAL DE REFORME DES MATIERES');

  const rows: [string, string][] = [
    ['Bien', bien?.designation || '—'],
    ['IUP / Référence', bien?.iup || bien?.id || '—'],
    ['Catégorie', bien?.categorie || '—'],
    ['Type de réforme', reforme?.typeReforme || '—'],
    ['Date de sortie', formatDate(reforme?.dateSortie || reforme?.dateReforme)],
    ['Motif', reforme?.motif || '—'],
    ['Valeur résiduelle', formatMoney(reforme?.valeurResiduelle)],
  ];

  let y = appendDetailsTable(doc, rows, 130);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Rapport technique', 40, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 18;
  const note = reforme?.rapportTechniqueUrl ? `Rapport disponible dans le dossier technique.` : 'Aucun rapport technique attaché.';
  doc.text(note, 40, y, { maxWidth: doc.internal.pageSize.getWidth() - 80 });

  y = Math.max(y + 80, 460);
  await drawSignatureBlock(doc, y, options?.signerName, options?.signatureDataUrl);
  doc.setFontSize(9);
  doc.text('Document généré par le système de gestion du patrimoine.', 40, doc.internal.pageSize.getHeight() - 40);
  return doc.output('blob');
}

export async function generateSinistrePdf(sinistre: any, bien: any, options?: { signerName?: string; signatureDataUrl?: string }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  drawDocumentHeader(doc, 'DECLARATION DE SINISTRE');

  const rows: [string, string][] = [
    ['Bien', bien?.designation || '—'],
    ['IUP / Référence', bien?.iup || bien?.id || '—'],
    ['Type de sinistre', sinistre?.type || '—'],
    ['Gravité', sinistre?.gravite || '—'],
    ['Montant estimé', formatMoney(sinistre?.montantEstime)],
    ['Date du sinistre', formatDate(sinistre?.dateSinistre)],
    ['Dossier assurance', sinistre?.numeroDossierAssureur || '—'],
  ];

  let y = appendDetailsTable(doc, rows, 130);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Constat et observations', 40, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y += 18;
  const desc = sinistre?.description || 'Aucune description disponible.';
  doc.text(desc, 40, y, { maxWidth: doc.internal.pageSize.getWidth() - 80 });

  y = Math.max(y + 80, 460);
  await drawSignatureBlock(doc, y, options?.signerName, options?.signatureDataUrl);
  doc.setFontSize(9);
  doc.text('Document généré par le système de gestion du patrimoine.', 40, doc.internal.pageSize.getHeight() - 40);
  return doc.output('blob');
}

export default generateAffectationPdf;