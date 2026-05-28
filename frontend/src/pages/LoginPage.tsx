import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LogIn, User, Lock, ShieldCheck, AlertCircle, CheckCircle2,
  Smartphone, ArrowLeft, KeyRound
} from 'lucide-react';
import axios from 'axios';
import './LoginPage.css';

type Step = 'credentials' | 'twofa';

const LoginPage: React.FC = () => {
  const [step, setStep] = useState<Step>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState(['', '', '', '', '', '']);
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Step 1: credentials ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if ((result as any)?.requiresTwoFactor) {
        // Backend demande la 2FA
        setTempToken((result as any).tempToken);
        setStep('twofa');
      } else {
        navigate('/biens');
      }
    } catch (err) {
      setError('Identifiants incorrects ou serveur injoignable.');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: TOTP verification ────────────────────────────────────────────
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...totpCode];
    next[index] = value.slice(-1);
    setTotpCode(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    // Auto-submit quand les 6 chiffres sont saisis
    if (next.every(d => d !== '') && value) {
      handleVerify2FA(next.join(''));
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !totpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify2FA = async (code?: string) => {
    const finalCode = code ?? totpCode.join('');
    if (finalCode.length !== 6) {
      setError('Entrez les 6 chiffres du code.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:8082/api/auth/2fa/verify',
        { code: parseInt(finalCode, 10) },
        { headers: { Authorization: `Bearer ${tempToken}` } }
      );
      const data = res.data;
      // Sauvegarder la session
      localStorage.setItem('currentUser', JSON.stringify(data));
      navigate('/biens');
    } catch {
      setError('Code invalide. Vérifiez votre application d\'authentification.');
      setTotpCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
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
            <span>Chiffrement AES-256 et authentification multifacteur activée.</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Form Section */}
      <div className="login-shell">
        <AnimatePresence mode="wait">
          {step === 'credentials' ? (
            // ── STEP 1: Login classique
            <motion.div
              key="credentials"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
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
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#0c192a' }}>Version 3.0.0-Sprint3</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Sécurité 2FA — Mai 2026</p>
                  </div>
                </div>
              </form>
            </motion.div>
          ) : (
            // ── STEP 2: TOTP 2FA
            <motion.div
              key="twofa"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%' }}
            >
              <div className="login-glass">
                {/* Header 2FA */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    style={{
                      width: 72, height: 72, borderRadius: 20,
                      background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 20px',
                      boxShadow: '0 10px 30px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    <Smartphone size={32} color="white" />
                  </motion.div>
                  <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: '#0c192a' }}>
                    Vérification 2FA
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
                    Entrez le code à 6 chiffres généré<br />
                    par votre application d'authentification.
                  </p>
                </div>

                {/* Badge icône sécurité */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.08))',
                    border: '1px solid rgba(99,102,241,0.2)',
                    borderRadius: 12, padding: '12px 16px', marginBottom: 28
                  }}
                >
                  <KeyRound size={18} color="#6366f1" />
                  <span style={{ fontSize: 13, color: '#4338ca', fontWeight: 500 }}>
                    Google Authenticator · Microsoft Authenticator
                  </span>
                </motion.div>

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      className="error"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ marginBottom: 20 }}
                    >
                      <AlertCircle size={18} />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* OTP Input boxes */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 32 }}>
                  {totpCode.map((digit, i) => (
                    <motion.input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 + 0.3 }}
                      style={{
                        width: 52, height: 60,
                        textAlign: 'center',
                        fontSize: 26, fontWeight: 700,
                        border: digit ? '2px solid #6366f1' : '2px solid #e2e8f0',
                        borderRadius: 14,
                        background: digit ? 'rgba(99,102,241,0.06)' : 'white',
                        color: '#0c192a',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        cursor: 'text',
                        boxShadow: digit ? '0 0 0 4px rgba(99,102,241,0.12)' : 'none',
                      }}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                {/* Verify button */}
                <motion.button
                  className="primary"
                  onClick={() => handleVerify2FA()}
                  disabled={loading || totpCode.some(d => !d)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    width: '100%'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    {loading ? (
                      <span className="loader-dots">Vérification...</span>
                    ) : (
                      <>
                        <ShieldCheck size={18} />
                        <span>Vérifier le code</span>
                      </>
                    )}
                  </div>
                </motion.button>

                {/* Back to step 1 */}
                <button
                  onClick={() => { setStep('credentials'); setError(''); setTotpCode(['', '', '', '', '', '']); }}
                  style={{
                    width: '100%', marginTop: 16, background: 'none', border: 'none',
                    color: '#64748b', cursor: 'pointer', fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '10px',
                    borderRadius: 10,
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default LoginPage;
