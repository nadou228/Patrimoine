/** États de conservation unifiés (CDC §4.2.2) */
export const ETATS_CONSTATES = [
  { value: 'BON', label: 'Bon état', color: '#10b981' },
  { value: 'MOYEN', label: 'État moyen', color: '#f59e0b' },
  { value: 'DEGRADE', label: 'Dégradé', color: '#ef4444' },
  { value: 'HORS_SERVICE', label: 'Hors service', color: '#7f1d1d' },
] as const;

export type EtatConstate = typeof ETATS_CONSTATES[number]['value'];

export const TYPE_ECART_LABELS: Record<string, string> = {
  BIEN_MANQUANT: 'Bien manquant',
  BIEN_NON_ENREGISTRE: 'Non comptabilisé',
  MAUVAISE_AFFECTATION: 'Mauvaise affectation',
  DIFFERENCE_VALEUR: 'Différence état/valeur',
  DOUBLE_ENREGISTREMENT: 'Double enregistrement',
};

export const normalizeEtatConstate = (etat?: string): EtatConstate => {
  if (!etat) return 'BON';
  const u = etat.toUpperCase();
  if (u === 'MAUVAIS' || u === 'HS') return u === 'HS' ? 'HORS_SERVICE' : 'DEGRADE';
  if (u === 'DEGRADE' || u === 'DÉGRADÉ') return 'DEGRADE';
  if (u === 'HORS_SERVICE') return 'HORS_SERVICE';
  if (u === 'MOYEN') return 'MOYEN';
  return 'BON';
};
