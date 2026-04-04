import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/biens');
    } catch (err) {
      setError('Identifiants incorrects ou serveur injoignable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-alt">
      <div className="login-hero">
        <div className="brand">
          <div className="brand-dot"></div>
          <h1 className="brand-name" style={{color: '#fff'}}>PATRIS</h1>
        </div>
        <div className="login-hero-content">
          <span className="login-tag">Système Intégré</span>
          <h2 style={{fontSize: '48px', marginTop: '20px'}}>Modernisez votre gestion d'actifs.</h2>
          <p style={{marginTop: '20px', opacity: 0.8}}>Plateforme unifiée pour le recensement, l'affectation et le suivi du patrimoine institutionnel.</p>
          
          <div className="login-metrics">
            <div><strong>+12k</strong><span>Biens Recencés</span></div>
            <div><strong>98%</strong><span>Précision Inventaire</span></div>
          </div>
        </div>
        
        <div className="login-orbit">
          <div className="orbit-card">
            <p>Sécurité Avancée</p>
            <span>Cryptage des données bout en bout</span>
          </div>
        </div>
      </div>

      <div className="login-shell">
        <form className="login-glass" onSubmit={handleLogin}>
          <div className="login-title">
            <h2 style={{color: '#1b2430'}}>Connexion</h2>
            <span>Entrez vos accès pour continuer</span>
          </div>

          {error && <p className="error">{error}</p>}

          <div className="field">
            <label>Email ou nom d'utilisateur</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ex: akim@domain.tg ou akim"
            />
          </div>

          <div className="field">
            <label>Mot de passe</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="primary" type="submit" disabled={loading} style={{width: '100%', marginTop: '10px'}}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <div className="login-footer">
            <label className="toggle">
              <input type="checkbox" /> Se souvenir de moi
            </label>
            <a href="#">Besoin d'aide ?</a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
