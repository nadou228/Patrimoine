import React, { useEffect, useState } from 'react';
import { getBiens, getUsers, getStocks, getAuditLogs, deleteAuditLog } from '../api/api';
import { exportXlsx, exportPdf } from '../utils/exporters';
import { RolePermissionsCard } from '../components/RolePermissionsCard';
import { usePermissions } from '../contexts/PermissionsContext';
import { 
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis
} from 'recharts';

const MONTH_NAMES = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];

const buildChartData = (biens: any[]) => {
  const grouped = biens.reduce((acc: Record<string, number>, b: any) => {
    if (!b.dateAcquisition) return acc;
    const date = new Date(b.dateAcquisition);
    if (isNaN(date.getTime())) return acc;
    const key = `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
    acc[key] = (acc[key] || 0) + (Number(b.valeur) || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
    .map(([name, valeur]) => ({ name, valeur }));
};

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({ total: 0, worth: 0, critical: 0, users: 0, stocks: 0, rawData: [] as any[] });
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivities, setShowActivities] = useState(false);
  const { role } = usePermissions();
  const currentUser = localStorage.getItem('username');

  const handleDeleteActivity = async (id: number) => {
    if (!window.confirm("Supprimer cette activité du journal ?")) return;
    try {
      await deleteAuditLog(id);
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert("Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [biensRaw, users, stocks, auditLogs] = await Promise.all([
          getBiens().catch(() => []),
          getUsers().catch(() => []),
          getStocks().catch(() => []),
          getAuditLogs().catch(() => [])
        ]);
        
        const biens = (biensRaw || []) as any[];
        const worth = biens.reduce((sum, b) => sum + (Number(b.valeur) || 0), 0);
        const critical = biens.filter(b => b.etat === 'DEGRADE' || b.etat === 'HS').length;

        setStats({
          total: biens.length,
          worth,
          critical,
          users: (users || []).length,
          stocks: (stocks || []).length,
          rawData: biens
        });

        setChartData(buildChartData(biens));

        // CORRECTION : Mapping aligné sur AuditLog.java (backend)
        const realActivities = (auditLogs || []).map((log: any) => ({
          id: log.id,
          type: log.action || 'ACTION',
          bien: log.entite || 'Élément', // 'entite' correspond au champ backend
          date: log.dateAction 
            ? new Date(log.dateAction).toLocaleString('fr-FR') 
            : 'Date inconnue', // 'dateAction' correspond au champ backend
          icon: log.action === 'DELETE' ? '🗑️' : log.action === 'UPDATE' ? '✏️' : '✨',
          username: log.username || 'Système'
        }));
        
        setActivities(realActivities.reverse());
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const handleExport = (type: 'XLS' | 'PDF') => {
    const data = stats.rawData.map(b => ({
      IUP: b.iup,
      Designation: b.designation,
      Valeur: b.valeur,
      Etat: b.etat
    }));
    if (type === 'XLS') exportXlsx(data, 'stats_patris.xlsx');
    else exportPdf(data, 'RAPPORT PATRIS', 'stats.pdf', []);
  };

  return (
    <div className="dashboard-module fade-in">
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Performance & Vue Globale</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Tableau de Pilotage</h2>
        </div>
        <div className="header-actions" style={{display: 'flex', gap: '10px'}}>
          <button className="btn-export" onClick={() => handleExport('XLS')}>📊 Export XLS</button>
          <button className="btn-export" onClick={() => handleExport('PDF')}>📕 Rapport PDF</button>
        </div>
      </header>

      {loading ? (
        <div style={{padding: '100px', textAlign: 'center'}}>
          <div className="loader"></div>
          <p style={{marginTop: '20px', opacity: 0.6}}>Analyse du patrimoine en cours...</p>
        </div>
      ) : (
        <>
          <div className="stats-grid-modern">
            <div className="stat-card-modern glass-card">
              <div className="stat-icon" style={{background: 'rgba(52, 152, 219, 0.1)', color: '#3498db'}}>📦</div>
              <div className="stat-content">
                <span className="stat-label">Total Actifs</span>
                <h3 className="stat-value">{stats.total}</h3>
              </div>
            </div>
            
            <div className="stat-card-modern glass-card">
              <div className="stat-icon" style={{background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71'}}>💰</div>
              <div className="stat-content">
                <span className="stat-label">Valeur Totale</span>
                <h3 className="stat-value">{stats.worth.toLocaleString()} <small>FCFA</small></h3>
              </div>
            </div>

            <div className="stat-card-modern glass-card">
              <div className="stat-icon" style={{background: 'rgba(155, 89, 182, 0.1)', color: '#9b59b6'}}>👥</div>
              <div className="stat-content">
                <span className="stat-label">Utilisateurs</span>
                <h3 className="stat-value">{stats.users}</h3>
              </div>
            </div>

            <div className="stat-card-modern glass-card">
              <div className="stat-icon" style={{background: 'rgba(241, 196, 15, 0.1)', color: '#f1c40f'}}>📦</div>
              <div className="stat-content">
                <span className="stat-label">Stocks</span>
                <h3 className="stat-value">{stats.stocks}</h3>
              </div>
            </div>

            <div className="stat-card-modern glass-card">
              <div className="stat-icon" style={{background: stats.critical > 0 ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)', color: stats.critical > 0 ? '#e74c3c' : '#2ecc71'}}>
                {stats.critical > 0 ? '🚨' : '🛡️'}
              </div>
              <div className="stat-content">
                <span className="stat-label">Alertes Critiques</span>
                <h3 className="stat-value" style={{color: stats.critical > 0 ? '#e74c3c' : 'inherit'}}>{stats.critical}</h3>
              </div>
            </div>
          </div>

          <div className="chart-section-modern glass-card">
            <div className="chart-header">
              <h3>Évolution de la Valeur du Patrimoine</h3>
            </div>
            <div style={{ width: '100%', height: 350, marginTop: '20px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.length > 0 ? chartData : [{ name: 'N/A', valeur: 0 }]}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3498db" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3498db" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#8e9aaf', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#8e9aaf', fontSize: 12}} tickFormatter={(value) => `${(value/1000).toLocaleString()}k`} />
                  <Tooltip contentStyle={{backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px'}} />
                  <Area type="monotone" dataKey="valeur" stroke="#3498db" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" activeDot={{ r: 6, strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      <RolePermissionsCard />

      <div className="asset-card" style={{marginTop: '40px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
          <h3 style={{margin: 0}}>Journal d'Activités</h3>
          <button onClick={() => setShowActivities(!showActivities)} className="btn-export">
            {showActivities ? '👁️ Masquer' : '👁️ Afficher'}
          </button>
        </div>

        {showActivities && (
          <div style={{display: 'grid', gap: '12px'}} className="fade-in">
            {activities.length > 0 ? (
                activities
                  .filter(a => role === 'ADMIN' || a.username === currentUser)
                  .map((activity) => (
                    <div key={activity.id} style={{padding: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', display: 'flex', gap: '16px', alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)'}}>
                      <span style={{fontSize: '22px'}}>{activity.icon}</span>
                      <div style={{flexGrow: 1}}>
                        <p style={{fontSize: '14px', fontWeight: '600', margin: 0}}>{activity.type}: {activity.bien}</p>
                        <p style={{fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0'}}>📅 {activity.date} | 👤 {activity.username}</p>
                      </div>
                      {role === 'ADMIN' && (
                        <button onClick={() => handleDeleteActivity(activity.id)} style={{background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.7}}>🗑️</button>
                      )}
                    </div>
                  ))
            ) : (
                <p style={{textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '20px'}}>Aucune activité récente à afficher.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;