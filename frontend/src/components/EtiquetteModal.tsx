import React from 'react';
import { EtiquetteDto } from '../api/admin'; // Je suppose qu'il sera ajouté à l'api
import './EtiquetteModal.css';

interface Props {
  data: EtiquetteDto;
  onClose: () => void;
}

const EtiquetteModal: React.FC<Props> = ({ data, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content etiquette-modal">
        <header className="modal-header">
          <h2>Aperçu de l'étiquette IUP</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </header>

        <div className="etiquette-container" id="printable-etiquette">
          <div className="etiquette-card">
            <div className="etiquette-header">
              <img src={data.logoMinistere} alt="Logo" className="mini-logo" />
              <div className="header-text">
                <h3>REPUBLIQUE TOGOLAISE</h3>
                <p>Ministère de l'Économie et des Finances</p>
              </div>
            </div>

            <div className="etiquette-body">
              <div className="qr-section">
                <img src={`data:image/png;base64,${data.qrCodeBase64}`} alt="QR Code" className="qr-code" />
                <span className="iup-label">{data.iup}</span>
              </div>
              <div className="info-section">
                <div className="info-row">
                  <span className="label">Désignation:</span>
                  <span className="value">{data.designation}</span>
                </div>
                <div className="info-row">
                  <span className="label">Catégorie:</span>
                  <span className="value">{data.categorie}</span>
                </div>
                <div className="info-row">
                  <span className="label">Service:</span>
                  <span className="value">{data.service}</span>
                </div>
                <div className="info-row">
                  <span className="label">Date:</span>
                  <span className="value">{data.dateAcquisition}</span>
                </div>
              </div>
            </div>
            
            <div className="etiquette-footer">
              SYSTÈME PATRIS - GESTION DU PATRIMOINE DE L'ÉTAT
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className="btn-primary" onClick={handlePrint}>Imprimer l'étiquette</button>
        </footer>
      </div>
    </div>
  );
};

export default EtiquetteModal;
