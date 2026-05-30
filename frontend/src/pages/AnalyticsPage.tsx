import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, ShieldAlert, CheckCircle2, Info, ArrowRight, Brain, AlertCircle,
  Target, Radar, LineChart, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  getDepreciationForecast, 
  getRiskHeatmap, 
  getAlertesIntelligentes,
  DepreciationPoint,
  RiskHeatmapItem,
  SmartAlerte 
} from '../api/api';

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString('fr-FR')} FCFA`;

export const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [forecast, setForecast] = useState<DepreciationPoint[]>([]);
  const [heatmap, setHeatmap] = useState<RiskHeatmapItem[]>([]);
  const [alertes, setAlertes] = useState<SmartAlerte[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fRes, hRes, aRes] = await Promise.all([
          getDepreciationForecast(),
          getRiskHeatmap(),
          getAlertesIntelligentes()
        ]);
        setForecast(fRes);
        setHeatmap(hRes);
        setAlertes(aRes);
      } catch (err) {
        console.error('Error loading analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleActionClick = (alertId: string) => {
    switch (alertId) {
      case 'REFORME_REQUISE':
        navigate('/reforme');
        break;
      case 'MAINTENANCE_RETARD':
        navigate('/entretiens');
        break;
      case 'STOCK_CRITIQUE':
        navigate('/stocks');
        break;
      case 'NON_AFFECTE':
        navigate('/biens');
        break;
      case 'SINISTRES_ACTIFS':
        navigate('/sinistres');
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner" />
        <p>Calcul des projections prédictives en cours...</p>
      </div>
    );
  }

  const criticalAlerts = alertes.filter(al => al.niveau === 'CRITIQUE').length;
  const highRiskAssets = heatmap.filter(item => item.niveau === 'CRITIQUE' || item.niveau === 'ÉLEVÉ').length;
  const averageRisk = heatmap.length
    ? Math.round(heatmap.reduce((sum, item) => sum + Number(item.scoreRisque || 0), 0) / heatmap.length)
    : 0;
  const firstValue = Number(forecast[0]?.valeurNette || 0);
  const lastValue = Number(forecast[forecast.length - 1]?.valeurNette || 0);
  const depreciationImpact = firstValue > 0 ? Math.round(((firstValue - lastValue) / firstValue) * 100) : 0;
  const aiMaturity = Math.max(0, 100 - criticalAlerts * 14 - highRiskAssets * 4 - Math.max(0, depreciationImpact - 25));

  return (
    <div className="analytics-container">
      {/* HEADER */}
      <div className="analytics-header">
        <div>
          <div className="badge-ia">
            <Brain size={14} />
            <span>Sprint 5 — Moteur Prédictif</span>
          </div>
          <h1>Analyses Prédictives & IA</h1>
          <p className="subtitle">
            Centre de décision patrimonial : projections, risques, recommandations et scénarios inspirés des pratiques de pilotage financier.
          </p>
        </div>
      </div>

      <div className="ai-command-center">
        <div className="ai-score-card">
          <div className="ai-score-orb">
            <Brain size={30} />
            <strong>{aiMaturity}</strong>
          </div>
          <div>
            <span>Indice IA de pilotage</span>
            <h2>{aiMaturity >= 75 ? 'Patrimoine maîtrisé' : aiMaturity >= 50 ? 'Surveillance active' : 'Plan d’action urgent'}</h2>
            <p>Score calculé à partir des alertes critiques, des actifs à risque et de la trajectoire de dépréciation.</p>
          </div>
        </div>
        <div className="ai-command-grid">
          <div className="ai-mini-card"><Radar size={20} /><span>Risque moyen</span><strong>{averageRisk} pts</strong></div>
          <div className="ai-mini-card"><Target size={20} /><span>Actifs exposés</span><strong>{highRiskAssets}</strong></div>
          <div className="ai-mini-card"><LineChart size={20} /><span>Impact 36 mois</span><strong>-{depreciationImpact}%</strong></div>
        </div>
      </div>

      <div className="ai-playbook">
        <div>
          <span><Sparkles size={14} /> Playbook intelligent</span>
          <h2>Questions prêtes pour PATRIS Copilot</h2>
        </div>
        <div className="ai-prompts">
          {[
            'Bonjour',
            'Fais-moi un diagnostic exécutif du patrimoine',
            'Quels risques dans les 90 prochains jours ?',
            'Quel plan de renouvellement recommandes-tu ?',
            'Quelles actions dois-je prioriser ?'
          ].map(prompt => <button key={prompt} type="button">{prompt}</button>)}
        </div>
      </div>

      {/* SYSTEM ALERTS ROW */}
      <div className="analytics-section">
        <h2 className="section-title">
          <ShieldAlert size={20} /> Alertes Proactives du Système
        </h2>
        <div className="alerts-grid">
          {alertes.map((al, idx) => (
            <motion.div
              key={al.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`alert-card ${al.niveau.toLowerCase()}`}
            >
              <div className="alert-card-header">
                <div className="alert-icon-box">
                  {al.niveau === 'CRITIQUE' && <AlertCircle size={20} />}
                  {al.niveau === 'ÉLEVÉ' && <AlertTriangle size={20} />}
                  {al.niveau === 'MOYEN' && <Info size={20} />}
                </div>
                <div>
                  <h3>{al.titre}</h3>
                  <span className={`alert-badge ${al.niveau.toLowerCase()}`}>{al.niveau}</span>
                </div>
              </div>
              <p className="alert-msg">{al.message}</p>
              <button onClick={() => handleActionClick(al.id)} className="alert-action-btn">
                <span>{al.action}</span>
                <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
          {alertes.length === 0 && (
            <div className="no-data-card">
              <CheckCircle2 size={24} className="text-success" />
              <p>Aucune alerte critique détectée. Tous les indicateurs sont au vert !</p>
            </div>
          )}
        </div>
      </div>

      <div className="analytics-main-grid">
        {/* DEPRECIATION FORECAST */}
        <div className="chart-card">
          <div className="card-header">
            <div>
              <h3>Projection de Dépréciation (36 Mois)</h3>
              <p>Évolution prévisionnelle de la Valeur Nette Comptable globale du parc</p>
            </div>
            <div className="icon-wrapper bg-indigo">
              <TrendingUp size={18} />
            </div>
          </div>
          
          <div style={{ width: '100%', height: 350 }}>
            <ResponsiveContainer>
              <AreaChart data={forecast} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={11} 
                  tickLine={false}
                  tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}M`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Valeur Nette']}
                  contentStyle={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="valeurNette" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RISK HEATMAP */}
        <div className="heatmap-card">
          <div className="card-header">
            <div>
              <h3>Score de Risque par Actif</h3>
              <p>Top 20 des biens les plus vulnérables du système</p>
            </div>
            <div className="icon-wrapper bg-rose">
              <AlertTriangle size={18} />
            </div>
          </div>

          <div className="heatmap-table-wrapper">
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th>Bien / IUP</th>
                  <th>Catégorie</th>
                  <th>Service</th>
                  <th>Vétusté</th>
                  <th>Niveau de Risque</th>
                </tr>
              </thead>
              <tbody>
                {heatmap.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="bien-cell">
                        <span className="bien-name">{item.designation}</span>
                        <span className="bien-iup">{item.iup}</span>
                      </div>
                    </td>
                    <td>
                      <span className="cat-badge">{item.categorie}</span>
                    </td>
                    <td>
                      <span className="service-text">{item.service}</span>
                    </td>
                    <td>
                      <div className="vetuste-progress-wrapper">
                        <div className="progress-bar-bg">
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${item.vetuste}%`,
                              backgroundColor: item.vetuste >= 80 ? '#ef4444' : item.vetuste >= 50 ? '#f59e0b' : '#3b82f6'
                            }} 
                          />
                        </div>
                        <span className="progress-percentage">{item.vetuste}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="score-badge-wrapper">
                        <span className={`score-badge ${item.niveau.toLowerCase()}`}>
                          {item.niveau} ({item.scoreRisque} pts)
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
                {heatmap.length === 0 && (
                  <tr>
                    <td colSpan={5} className="no-data-cell">
                      Aucun bien à risque identifié.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`
        .analytics-container {
          padding: 30px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .analytics-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          color: #64748b;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .analytics-header {
          margin-bottom: 30px;
        }

        .badge-ia {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #e0e7ff;
          color: #4f46e5;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .analytics-header h1 {
          font-size: 2.2rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 8px 0;
          letter-spacing: -1px;
        }

        .subtitle {
          color: #64748b;
          font-size: 15px;
          margin: 0;
        }

        .ai-command-center {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
          gap: 20px;
          margin-bottom: 24px;
        }

        .ai-score-card, .ai-mini-card, .ai-playbook {
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        }

        .ai-score-card {
          display: flex;
          align-items: center;
          gap: 22px;
          padding: 24px;
          border-radius: 18px;
          background: linear-gradient(135deg, #0f172a, #0e7490);
          color: white;
        }

        .ai-score-orb {
          width: 112px;
          height: 112px;
          display: grid;
          place-items: center;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.22);
        }

        .ai-score-orb strong {
          font-size: 34px;
          font-weight: 900;
          line-height: 1;
        }

        .ai-score-card span, .ai-playbook span {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          opacity: 0.78;
        }

        .ai-score-card h2 {
          margin: 8px 0;
          font-size: 26px;
          font-weight: 900;
        }

        .ai-score-card p {
          margin: 0;
          color: rgba(255,255,255,0.76);
          line-height: 1.6;
        }

        .ai-command-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .ai-mini-card {
          padding: 18px;
          border-radius: 18px;
          display: grid;
          gap: 10px;
        }

        .ai-mini-card svg {
          color: #0ea5e9;
        }

        .ai-mini-card span {
          color: #64748b;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .ai-mini-card strong {
          color: #0f172a;
          font-size: 24px;
          font-weight: 900;
        }

        .ai-playbook {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
          border-radius: 18px;
          margin-bottom: 30px;
        }

        .ai-playbook span {
          color: #4f46e5;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .ai-playbook h2 {
          margin: 6px 0 0;
          color: #0f172a;
          font-size: 18px;
          font-weight: 900;
        }

        .ai-prompts {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
        }

        .ai-prompts button {
          border: 1px solid #dbe3ef;
          background: #f8fafc;
          color: #334155;
          border-radius: 999px;
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 800;
        }

        @media (max-width: 1100px) {
          .ai-command-center {
            grid-template-columns: 1fr;
          }

          .ai-command-grid {
            grid-template-columns: 1fr;
          }

          .ai-playbook {
            align-items: flex-start;
            flex-direction: column;
          }

          .ai-prompts {
            justify-content: flex-start;
          }
        }

        .analytics-section {
          margin-bottom: 35px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 800;
          color: #334155;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .alerts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .alert-card {
          background: white;
          border-radius: 20px;
          padding: 20px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
        }

        .alert-card:hover {
          transform: translateY(-4px);
        }

        .alert-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 5px;
        }

        .alert-card.critique::before { background: #ef4444; }
        .alert-card.élevé::before { background: #f59e0b; }
        .alert-card.moyen::before { background: #3b82f6; }

        .alert-card-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .alert-icon-box {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .critique .alert-icon-box { background: #fee2e2; color: #ef4444; }
        .élevé .alert-icon-box { background: #fef3c7; color: #d97706; }
        .moyen .alert-icon-box { background: #dbeafe; color: #2563eb; }

        .alert-card-header h3 {
          margin: 0 0 4px 0;
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
        }

        .alert-badge {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .alert-badge.critique { background: #fee2e2; color: #ef4444; }
        .alert-badge.élevé { background: #fef3c7; color: #d97706; }
        .alert-badge.moyen { background: #dbeafe; color: #2563eb; }

        .alert-msg {
          font-size: 12px;
          color: #64748b;
          line-height: 1.5;
          margin: 0 0 20px 0;
          flex-grow: 1;
        }

        .alert-action-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          border: 1px solid #e2e8f0;
          background: white;
          color: #4f46e5;
          font-weight: 700;
          font-size: 12px;
          padding: 10px 14px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .alert-action-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .no-data-card {
          grid-column: 1 / -1;
          background: white;
          padding: 30px;
          border-radius: 20px;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: #64748b;
          text-align: center;
        }

        .text-success {
          color: #10b981;
        }

        .analytics-main-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 30px;
        }

        @media (min-width: 1200px) {
          .analytics-main-grid {
            grid-template-columns: 1.2fr 1fr;
          }
        }

        .chart-card, .heatmap-card {
          background: white;
          border-radius: 24px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          padding: 24px;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
        }

        .card-header h3 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
        }

        .card-header p {
          margin: 0;
          font-size: 12px;
          color: #64748b;
        }

        .icon-wrapper {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-indigo { background: #e0e7ff; color: #4f46e5; }
        .bg-rose { background: #ffe4e6; color: #e11d48; }

        /* Heatmap Table */
        .heatmap-table-wrapper {
          overflow-x: auto;
        }

        .heatmap-table {
          width: 100%;
          border-collapse: collapse;
        }

        .heatmap-table th {
          text-align: left;
          font-size: 11px;
          font-weight: 800;
          color: #94a3b8;
          text-transform: uppercase;
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
        }

        .heatmap-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }

        .bien-cell {
          display: flex;
          flex-direction: column;
        }

        .bien-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 13px;
        }

        .bien-iup {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 600;
          margin-top: 2px;
        }

        .cat-badge {
          font-size: 10px;
          font-weight: 700;
          background: #f1f5f9;
          color: #475569;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .service-text {
          font-size: 12px;
          color: #475569;
        }

        .vetuste-progress-wrapper {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .progress-bar-bg {
          width: 60px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 3px;
        }

        .progress-percentage {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
        }

        .score-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .score-badge.critique { background: #fee2e2; color: #ef4444; }
        .score-badge.élevé { background: #fef3c7; color: #d97706; }
        .score-badge.moyen { background: #dbeafe; color: #2563eb; }
        .score-badge.bas { background: #d1fae5; color: #10b981; }

        .no-data-cell {
          text-align: center;
          color: #94a3b8;
          font-size: 12px;
          padding: 30px !important;
        }
      `}</style>
    </div>
  );
};

export default AnalyticsPage;
