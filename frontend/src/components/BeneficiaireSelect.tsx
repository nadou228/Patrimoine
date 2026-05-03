import React, { useState, useEffect } from 'react';
import { api } from '../api/api';

interface Beneficiaire {
  id: number;
  nom: string;
  prenom: string;
  fonction: string;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const BeneficiaireSelect: React.FC<Props> = ({ value, onChange }) => {
  const [beneficiaires, setBeneficiaires] = useState<Beneficiaire[]>([]);

  useEffect(() => {
    api.get('/beneficiaires')
      .then(res => setBeneficiaires(res.data))
      .catch(console.error);
  }, []);

  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">-- Choisir un bénéficiaire --</option>
      {beneficiaires.map(b => (
        <option key={b.id} value={b.id.toString()}>
          {b.nom} {b.prenom} ({b.fonction})
        </option>
      ))}
    </select>
  );
};

export default BeneficiaireSelect;
