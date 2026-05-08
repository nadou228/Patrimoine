import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, User, Lock, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import './LoginPage.css';

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
      {/* Hero Section */}
      <motion.div 
        className="login-hero"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="brand">
          <div className="brand-dot"></div>
          <h1 className="brand-name">PATRIS</h1>
        </div>

        <div className="login-hero-content">
          <motion.span 
            className="login-tag"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Système Intégré de Gestion
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Gérez votre patrimoine avec <span style={{ color: 'var(--primary)' }}>précision</span>.
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            Optimisez le cycle de vie de vos actifs institutionnels grâce à une plateforme intelligente, sécurisée et conforme.
          </motion.p>
          
          <div className="login-metrics">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
              <strong>+12k</strong>
              <span>Biens Recensés</span>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              <strong>99.9%</strong>
              <span>Disponibilité</span>
            </motion.div>
          </div>
        </div>
        
        <motion.div 
          className="login-orbit"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
        >
          <div className="orbit-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <ShieldCheck size={20} color="var(--primary)" />
              <p style={{ margin: 0 }}>Sécurité Bancaire</p>
            </div>
            <span>Chiffrement AES-256 et authentification multifacteur disponible.</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Login Form Section */}
      <div className="login-shell">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{ width: '100%' }}
        >
          <form className="login-glass" onSubmit={handleLogin}>
            <div className="login-title">
              <h2>Connexion</h2>
              <span>Ravi de vous revoir ! Entrez vos accès.</span>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  className="error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="field">
              <label>Identifiant</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  required 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Email ou matricule"
                  style={{ paddingLeft: '48px' }}
                />
              </div>
            </div>

            <div className="field">
              <label>Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="password" 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: '48px' }}
                />
              </div>
            </div>

            <motion.button 
              className="primary" 
              type="submit" 
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                {loading ? (
                  <span className="loader-dots">Connexion...</span>
                ) : (
                  <>
                    <span>Se connecter</span>
                    <LogIn size={18} />
                  </>
                )}
              </div>
            </motion.button>

            <div className="login-footer">
              <label className="toggle">
                <input type="checkbox" style={{ width: 'auto' }} /> 
                <span>Rester connecté</span>
              </label>
              <a href="#">Mot de passe oublié ?</a>
            </div>
            
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#64748b" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0c192a' }}>Version 2.4.0-Pro</p>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Dernière mise à jour : Mai 2024</p>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;

