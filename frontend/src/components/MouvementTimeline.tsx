import React from 'react';

interface Mouvement {
  id: number;
  type: string;
  dateCreation: string;
  observation: string;
  serviceSource?: { nomService: string };
  serviceDestination?: { nomService: string };
  validePar?: string;
}

interface Props {
  mouvements: Mouvement[];
  onClose: () => void;
}

export default function MouvementTimeline({ mouvements, onClose }: Props) {
  return (
    <div className="modal-overlay fade-in" style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="centered-form-card" style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="form-header-premium" style={{ marginBottom: '30px' }}>
           <h2>🗺️ Parcours de l'Actif</h2>
           <button className="btn-back-cat" onClick={onClose}>Fermer</button>
        </div>

        <div className="timeline-container" style={{ position: 'relative', paddingLeft: '40px' }}>
          {/* Vertical line */}
          <div style={{
              position: 'absolute', left: '15px', top: '10px', bottom: '10px',
              width: '2px', background: 'linear-gradient(to bottom, var(--primary), var(--secondary))',
              opacity: 0.3
          }}></div>

          {mouvements.length === 0 && (
            <p style={{textAlign: 'center', color: 'var(--text-dim)', padding: '20px'}}>Aucun historique enregistré pour le moment.</p>
          )}

          {mouvements.map((m, idx) => (
            <div key={m.id} className="timeline-item" style={{ position: 'relative', marginBottom: '40px' }}>
              {/* Dot */}
              <div style={{
                  position: 'absolute', left: '-33px', top: '5px',
                  width: '18px', height: '18px', borderRadius: '50%',
                  background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)',
                  border: '3px solid var(--card-bg)', zIndex: 2
              }}></div>

              <div className="timeline-content" style={{
                  background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px',
                  border: '1px solid var(--glass-border)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                   <span className="badge-pill-glow" style={{fontSize: '10px'}}>{new Date(m.dateCreation).toLocaleDateString()}</span>
                   <span className="status-pill status-neuf" style={{fontSize: '10px'}}>{m.type}</span>
                </div>
                <p style={{ fontSize: '14px', marginBottom: '10px', color: 'var(--text-main)' }}>{m.observation}</p>
                
                <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                   {m.serviceSource && <div>🛫 De: {m.serviceSource.nomService}</div>}
                   {m.serviceDestination && <div>🛬 Vers: {m.serviceDestination.nomService}</div>}
                   {m.validePar && <div style={{gridColumn: 'span 2'}}>👤 Validé par: {m.validePar}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
