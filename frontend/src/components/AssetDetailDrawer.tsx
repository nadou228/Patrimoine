import React, { useState } from 'react';
import { X, FileText, CheckCircle2, AlertTriangle, Info, Clock, Edit, Shield, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock formatMoney function for standalone usage
const formatMoney = (value: number | undefined) => {
  if (value == null) return "0 FCFA";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF" }).format(value).replace("XOF", "FCFA");
};

const normalizeUrl = (url: string) => url.startsWith("http") ? url : `http://localhost:8082${url}`;

export default function AssetDetailDrawer({ 
  historyPanel, 
  setHistoryPanel, 
  editBien, 
  setViewerMedia 
}: any) {
  const [activeTab, setActiveTab] = useState<'details' | 'amortissement' | 'history'>('details');

  if (!historyPanel || !historyPanel.bien) return null;

  const { bien, loading, entries } = historyPanel;
  const valeur = bien.valeur || 0;
  const vnc = bien.valeurNetteComptable ?? valeur;
  const amorti = valeur - vnc;
  const pourcentageAmorti = valeur > 0 ? (amorti / valeur) * 100 : 0;

  const renderStatusBadge = () => {
    switch(bien.statutOperationnel) {
      case 'EN_MAINTENANCE': return <span style={{ background: '#f59e0b20', color: '#d97706', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>🛠️ EN MAINTENANCE</span>;
      case 'REFORME': return <span style={{ background: '#ef444420', color: '#dc2626', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>⛔ RÉFORMÉ</span>;
      case 'ACTIF':
      default: return <span style={{ background: '#10b98120', color: '#059669', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}>✅ ACTIF</span>;
    }
  };

  const renderAffectationStatus = () => {
    const hasTransfert = entries?.some((e: any) => e.typeEvenement?.toUpperCase().includes("TRANSFERT"));
    const hasAffectation = entries?.some((e: any) => e.typeEvenement?.toUpperCase().includes("AFFECTATION"));
    const isAffected = Boolean(bien.service || hasAffectation);

    if (hasTransfert) {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#3b82f620', color: '#2563eb', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}><ArrowRightLeft size={14}/> Transféré</span>;
    }

    if (bien.statutOperationnel === 'SINISTRE') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f871710f', color: '#b91c1c', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}><AlertTriangle size={14}/> Sinistré</span>;
    }

    if (bien.statutOperationnel === 'HORS_SERVICE') {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#7f1d1d0f', color: '#7f1d1d', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}><TrendingDown size={14}/> Hors service</span>;
    }

    if (isAffected) {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#6366f120', color: '#4f46e5', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}><CheckCircle2 size={14}/> Affecté</span>;
    }

    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e2e8f0', color: '#64748b', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 800 }}><Info size={14}/> Non Affecté</span>;
  };

  // Tableau d'amortissement prévisionnel
  const generateAmortizationTable = () => {
    if (!bien.dateAcquisition || !bien.dureeAmortissement || bien.dureeAmortissement <= 0) return null;
    const yearStart = new Date(bien.dateAcquisition).getFullYear();
    const table = [];
    let currentVNC = valeur;
    const annuite = valeur / bien.dureeAmortissement;
    let cumul = 0;
    for (let i = 1; i <= bien.dureeAmortissement; i++) {
      cumul += annuite;
      currentVNC = Math.max(0, valeur - cumul);
      table.push(
        <tr key={i}>
          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#64748b', fontWeight: 600 }}>{yearStart + i - 1}</td>
          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>{formatMoney(valeur)}</td>
          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#d97706', fontWeight: 600 }}>{formatMoney(annuite)}</td>
          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#ef4444', fontWeight: 700 }}>{formatMoney(cumul)}</td>
          <td style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', color: '#10b981', fontWeight: 800 }}>{formatMoney(currentVNC)}</td>
        </tr>
      );
    }
    return table;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="side-panel-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(15, 23, 42, 0.6)', zIndex: 0 }} onClick={() => setHistoryPanel(null)} />
      
      <motion.aside 
        initial={{ x: '100%', opacity: 0 }} 
        animate={{ x: 0, opacity: 1 }} 
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        style={{ 
          position: 'absolute', right: 0, top: 0, bottom: 0, width: '100%', maxWidth: 700, 
          background: '#ffffff', boxShadow: '-10px 0 40px rgba(0,0,0,0.1)', 
          display: 'flex', flexDirection: 'column', zIndex: 1
        }}
      >
        {/* HEADER */}
        <div style={{ padding: '32px 40px 0', background: 'linear-gradient(to bottom, #f8fafc, #ffffff)', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                {renderStatusBadge()}
                {renderAffectationStatus()}
              </div>
              <h2 style={{ fontSize: 26, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.03em', lineHeight: 1.2 }}>
                {bien.designation}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                <code style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 800, background: 'rgba(79, 70, 229, 0.08)', padding: '4px 10px', borderRadius: 6 }}>
                  {bien.iup || "SANS IUP"}
                </code>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Shield size={14} /> {bien.categoriePrincipale}
                </span>
                <span style={{ fontSize: 13, color: '#94a3b8' }}>•</span>
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={14} /> {bien.service || "Aucun service affecté"}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setHistoryPanel(null)}
              style={{ width: 44, height: 44, borderRadius: 16, border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#e2e8f0'}
              onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
            >
              <X size={22} />
            </button>
          </div>

          {/* TABS */}
          <div style={{ display: 'flex', gap: 32 }}>
            {[
              { id: 'details', label: 'Aperçu & Détails' },
              { id: 'amortissement', label: 'Amortissement' },
              { id: 'history', label: 'Historique & Affectations' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '16px 0', background: 'none', border: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid var(--primary)' : '3px solid transparent',
                  color: activeTab === tab.id ? 'var(--primary)' : '#94a3b8',
                  fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', background: '#f8fafc' }}>
          <AnimatePresence mode="wait">
            
            {activeTab === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {/* VNC Highlights */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
                  <div className="glass-card" style={{ padding: 24, background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                    <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, display: 'block', marginBottom: 8 }}>Valeur d'Acquisition</span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a' }}>{formatMoney(valeur)}</div>
                    <div style={{ marginTop: 12, fontSize: 12, color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} /> Acquis le {bien.dateAcquisition ? new Date(bien.dateAcquisition).toLocaleDateString('fr-FR') : "N/C"}
                    </div>
                  </div>
                  
                  <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)', borderRadius: 20, border: '1px solid #d1fae5', boxShadow: '0 4px 6px -1px rgba(16,185,129,0.05)' }}>
                    <span style={{ fontSize: 11, color: '#059669', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, display: 'block', marginBottom: 8 }}>Valeur Nette Comptable</span>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>{formatMoney(vnc)}</div>
                    <div style={{ marginTop: 12, height: 6, background: '#a7f3d0', borderRadius: 6, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${100 - pourcentageAmorti}%` }} transition={{ duration: 1, delay: 0.2 }} style={{ height: '100%', background: '#10b981', borderRadius: 6 }} />
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11, color: '#059669', fontWeight: 700, textAlign: 'right' }}>
                      {(100 - pourcentageAmorti).toFixed(1)}% résiduel
                    </div>
                  </div>
                </div>

                {/* Additional Info Grid */}
                <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
                  {[
                    { label: 'Famille / Nomenclature', value: bien.codeFamille || "Non défini" },
                    { label: 'État Physique', value: bien.etat || "Neuf" },
                    { label: 'Localisation précise', value: bien.localisation || "Non défini" },
                    { label: 'Mode d\'acquisition', value: bien.modeAcquisition || "Achat" },
                  ].map((item, i) => (
                    <div key={i}>
                      <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 6, display: 'block' }}>{item.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#334155' }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* MEDIA SECTION */}
                {(bien.photoUrl || (bien.documentsUrls && bien.documentsUrls.length > 0)) && (
                  <div style={{ marginTop: 32 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Médias & Documents</h3>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {bien.photoUrl && (
                        <div 
                          onClick={() => setViewerMedia({ url: normalizeUrl(bien.photoUrl), type: 'image', filename: 'Photo Principale' })}
                          style={{ width: 140, height: 100, borderRadius: 16, background: `url(${normalizeUrl(bien.photoUrl)}) center/cover`, border: '1px solid #e2e8f0', cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                        >
                          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', color: 'white', fontSize: 11, fontWeight: 800 }}>Photo</div>
                        </div>
                      )}
                      {bien.documentsUrls?.map((url: string, i: number) => (
                        <div 
                          key={i} 
                          onClick={() => setViewerMedia({ url: normalizeUrl(url), type: url.match(/\.(jpg|jpeg|png)$/i) ? 'image' : 'pdf', filename: `Document ${i + 1}` })}
                          style={{ width: 100, height: 100, borderRadius: 16, background: '#ffffff', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.02)', transition: 'all 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                        >
                          <FileText size={28} color="var(--primary)" style={{ opacity: 0.8 }} />
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#475569' }}>Doc {i + 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'amortissement' && (
              <motion.div key="amortissement" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="glass-card" style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 24, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <TrendingDown size={24} color="var(--primary)" />
                    <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, color: '#0f172a' }}>Plan d'Amortissement Linéaire</h3>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32, padding: 20, background: '#f8fafc', borderRadius: 16 }}>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Durée Totale</span>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{bien.dureeAmortissement || 0} Ans</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Taux Annuel</span>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{bien.tauxAmortissement ? bien.tauxAmortissement.toFixed(2) : ((100 / (bien.dureeAmortissement || 1)).toFixed(2))}%</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Amortissement Cumulé</span>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', marginTop: 4 }}>{formatMoney(bien.amortissementCumule || 0)}</div>
                    </div>
                  </div>

                  {bien.dureeAmortissement > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f1f5f9', color: '#64748b', fontWeight: 800, borderRadius: '8px 0 0 8px' }}>Année</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f1f5f9', color: '#64748b', fontWeight: 800 }}>Base à Amortir</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f1f5f9', color: '#64748b', fontWeight: 800 }}>Annuité</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f1f5f9', color: '#64748b', fontWeight: 800 }}>Cumul</th>
                            <th style={{ textAlign: 'left', padding: '12px 16px', background: '#f1f5f9', color: '#64748b', fontWeight: 800, borderRadius: '0 8px 8px 0' }}>VNC Fin Année</th>
                          </tr>
                        </thead>
                        <tbody>
                          {generateAmortizationTable()}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                      <AlertTriangle size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                      <p style={{ fontWeight: 600 }}>Aucune durée d'amortissement définie pour ce bien.</p>
                      <button onClick={() => { setHistoryPanel(null); editBien(bien); }} style={{ marginTop: 12, padding: '8px 16px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                        Définir la durée
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {loading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, background: '#ffffff' }} />)}
                  </div>
                ) : entries?.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                    <Info size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p style={{ fontSize: 16, fontWeight: 700 }}>Aucun événement trouvé.</p>
                    <p style={{ fontSize: 14 }}>Ce bien n'a pas encore fait l'objet d'affectation ou de mouvement.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 24, top: 20, bottom: 20, width: 2, background: '#e2e8f0', zIndex: 0 }} />
                    {entries.map((entry: any, idx: number) => (
                      <div key={idx} style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 24, background: '#ffffff', padding: 20, borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', background: entry.typeEvenement.includes('AFFECTATION') ? '#4f46e5' : entry.typeEvenement.includes('TRANSFERT') ? '#0ea5e9' : 'var(--primary)', marginTop: 4, flexShrink: 0, border: '3px solid #ffffff', boxShadow: '0 0 0 1px #e2e8f0' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 0.5 }}>{entry.typeEvenement}</span>
                            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '4px 10px', borderRadius: 20 }}>
                              {entry.date ? new Date(entry.date).toLocaleDateString('fr-FR') : "Date N/C"}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, color: '#475569', lineHeight: 1.6, fontWeight: 500 }}>{entry.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* FOOTER ACTIONS */}
        <div style={{ padding: '24px 40px', background: '#ffffff', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16 }}>
          <button 
            className="primary-premium" 
            style={{ flex: 1, height: 56, borderRadius: 16, fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={() => {
              setHistoryPanel(null);
              editBien(bien);
            }}
          >
            <Edit size={18} /> Modifier le bien
          </button>
        </div>
      </motion.aside>
    </div>
  );
}
