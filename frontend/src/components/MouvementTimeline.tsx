import React from 'react';

interface HistoriqueEntry {
  date: string;
  typeEvenement: string;
  description: string;
  utilisateur?: string;
  details?: string;
}

interface Props {
  mouvements: HistoriqueEntry[];
  onClose: () => void;
}

export default function MouvementTimeline({ mouvements, onClose }: Props) {
  
  const getIcon = (type: string) => {
    switch (type) {
      case 'AFFECTATION': return '👤';
      case 'SINISTRE': return '⚠️';
      case 'ENTRETIEN': return '🛠️';
      case 'MOUVEMENT_STOCK': return '📦';
      case 'AUDIT': return '📋';
      default: return '📍';
    }
  };

  const getStatusClass = (type: string) => {
    switch (type) {
      case 'SINISTRE': return 'status-refuse';
      case 'AFFECTATION': return 'status-valide';
      case 'ENTRETIEN': return 'status-neuf';
      default: return 'status-en-attente';
    }
  };

  return (
    <div className="modal-overlay fade-in" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="centered-form-card" style={{ maxWidth: '700px', width: '90%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="form-header-premium" style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span style={{ fontSize: '30px' }}>📜</span>
              <div>
                <h2 style={{ margin: 0 }}>Parcours de l'Actif</h2>
                <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>Historique complet des événements</p>
              </div>
           </div>
           <button className="btn-back-cat" onClick={onClose}>Fermer</button>
        </div>

        <div className="timeline-container" style={{ position: 'relative', paddingLeft: '50px', paddingRight: '20px' }}>
          {/* Vertical line */}
          <div style={{
              position: 'absolute', left: '20px', top: '10px', bottom: '10px',
              width: '2px', background: 'linear-gradient(to bottom, var(--primary), var(--secondary))',
              opacity: 0.3
          }}></div>

          {mouvements.length === 0 && (
            <div style={{textAlign: 'center', color: 'var(--text-dim)', padding: '40px'}}>
               <p style={{fontSize: '40px'}}>🕸️</p>
               <p>Aucun événement enregistré pour le moment.</p>
            </div>
          )}

          {mouvements.map((m, idx) => (
            <div key={idx} className="timeline-item" style={{ position: 'relative', marginBottom: '40px' }}>
              {/* Dot */}
              <div style={{
                  position: 'absolute', left: '-42px', top: '5px',
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--card-bg)', 
                  boxShadow: '0 0 15px var(--primary-glow)',
                  border: '2px solid var(--primary)', 
                  zIndex: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px'
              }}>{getIcon(m.typeEvenement)}</div>

              <div className="timeline-content" style={{
                  background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '15px',
                  border: '1px solid var(--glass-border)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                   <span className="badge-pill-glow" style={{fontSize: '11px'}}>
                      {m.date ? new Date(m.date).toLocaleString('fr-FR', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : 'Date inconnue'}
                   </span>
                   <span className={`status-pill ${getStatusClass(m.typeEvenement)}`} style={{fontSize: '10px', fontWeight: 'bold'}}>
                      {m.typeEvenement}
                   </span>
                </div>
                
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-main)' }}>{m.description}</h4>
                <p style={{ fontSize: '13px', marginBottom: '12px', color: 'var(--text-dim)', lineHeight: '1.5' }}>{m.details}</p>
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px', fontSize: '11px', color: 'var(--primary)' }}>
                   👤 Action par : <strong>{m.utilisateur || 'Système'}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
