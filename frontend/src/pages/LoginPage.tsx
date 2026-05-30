import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  LogIn,
  ShieldCheck,
  Smartphone,
  User,
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      if ((result as any)?.requiresTwoFactor) {
        setTempToken((result as any).tempToken);
        setStep('twofa');
      } else {
        navigate('/biens');
      }
    } catch {
      setError('Identifiants incorrects ou serveur injoignable.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...totpCode];
    next[index] = value.slice(-1);
    setTotpCode(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every(digit => digit !== '') && value) {
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
      localStorage.setItem('currentUser', JSON.stringify(res.data));
      navigate('/biens');
    } catch {
      setError("Code invalide. Vérifiez votre application d'authentification.");
      setTotpCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-alt">
      <section className="login-hero" aria-label="Présentation PATRIS">
        <motion.div
          className="brand"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <div className="brand-mark">
            <span />
          </div>
          <div>
            <h1 className="brand-name">PATRIS</h1>
            <p>Patrimoine public intelligent</p>
          </div>
        </motion.div>

        <motion.div
          className="hero-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
        >
          <span className="login-tag">Système intégré de gestion</span>
          <h2>
            Pilotez vos actifs avec une précision d'état-major.
          </h2>
          <p>
            Une plateforme moderne pour fiabiliser l'inventaire, sécuriser les mouvements
            et donner aux décideurs une vision claire du patrimoine institutionnel.
          </p>

          <div className="login-metrics" aria-label="Indicateurs clés">
            <div>
              <strong>12k+</strong>
              <span>Biens consolidés</span>
            </div>
            <div>
              <strong>99.9%</strong>
              <span>Traçabilité</span>
            </div>
            <div>
              <strong>2FA</strong>
              <span>Sécurité active</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="insight-grid"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3 }}
        >
          <article className="insight-card is-primary">
            <div className="insight-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3>Sécurité bancaire</h3>
              <p>Accès renforcé, journalisation et authentification multifacteur.</p>
            </div>
          </article>
          <article className="insight-card">
            <div className="insight-icon">
              <Database size={20} />
            </div>
            <div>
              <h3>Nomenclature unifiée</h3>
              <p>Référentiel métier harmonisé pour l'ensemble des actifs.</p>
            </div>
          </article>
          <article className="insight-card">
            <div className="insight-icon">
              <Activity size={20} />
            </div>
            <div>
              <h3>Pilotage temps réel</h3>
              <p>Suivi opérationnel des biens, stocks et affectations critiques.</p>
            </div>
          </article>
        </motion.div>
      </section>

      <section className="login-shell" aria-label="Authentification">
        <div className="login-card-frame">
          <div className="status-ribbon">
            <Building2 size={16} />
            <span>Console sécurisée</span>
          </div>

          <AnimatePresence mode="wait">
            {step === 'credentials' ? (
              <motion.form
                key="credentials"
                className="login-glass"
                onSubmit={handleLogin}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.35 }}
              >
                <div className="login-title">
                  <span>Accès utilisateur</span>
                  <h2>Connexion</h2>
                  <p>Ravi de vous revoir. Entrez vos accès pour continuer.</p>
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
                  <div className="input-wrap">
                    <User size={18} />
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Email ou matricule"
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Mot de passe</label>
                  <div className="input-wrap">
                    <Lock size={18} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <motion.button
                  className="primary"
                  type="submit"
                  disabled={loading}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? (
                    <span className="loader-dots">Connexion...</span>
                  ) : (
                    <>
                      <span>Se connecter</span>
                      <LogIn size={18} />
                    </>
                  )}
                </motion.button>

                <div className="login-footer">
                  <label className="toggle">
                    <input type="checkbox" />
                    <span>Rester connecté</span>
                  </label>
                  <a href="#">Mot de passe oublié ?</a>
                </div>

                <div className="version-strip">
                  <div className="version-icon">
                    <CheckCircle2 size={19} />
                  </div>
                  <div>
                    <p>Version 3.0.0-Sprint3</p>
                    <span>Sécurité 2FA · Mai 2026</span>
                  </div>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="twofa"
                className="login-glass twofa-card"
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ duration: 0.35 }}
              >
                <div className="twofa-header">
                  <motion.div
                    className="twofa-icon"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                  >
                    <Smartphone size={30} />
                  </motion.div>
                  <span>Double validation</span>
                  <h2>Vérification 2FA</h2>
                  <p>
                    Entrez le code à 6 chiffres généré par votre application d'authentification.
                  </p>
                </div>

                <div className="auth-badge">
                  <KeyRound size={18} />
                  <span>Google Authenticator · Microsoft Authenticator</span>
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

                <div className="otp-grid">
                  {totpCode.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => { inputRefs.current[index] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 + 0.15 }}
                      className={digit ? 'filled' : ''}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <motion.button
                  className="primary"
                  onClick={() => handleVerify2FA()}
                  disabled={loading || totpCode.some(digit => !digit)}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {loading ? (
                    <span className="loader-dots">Vérification...</span>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Vérifier le code</span>
                    </>
                  )}
                </motion.button>

                <button
                  className="ghost-action"
                  onClick={() => {
                    setStep('credentials');
                    setError('');
                    setTotpCode(['', '', '', '', '', '']);
                  }}
                >
                  <ArrowLeft size={16} />
                  Retour à la connexion
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
};

export default LoginPage;
