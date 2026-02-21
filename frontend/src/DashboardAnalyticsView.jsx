import React, { useEffect, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

import { Activity, BrainCircuit, BarChart3, LayoutDashboard, Loader2, Target, ShieldCheck, Zap } from 'lucide-react';
import axios from 'axios';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const DashboardAnalyticsView = ({ mission }) => {
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('STATS');
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (mission?.id) fetchStats(); }, [mission]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/advanced-stats/${mission.id}`);
      setStats(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading || !stats) return (
    <div className="flex flex-col items-center justify-center p-20 text-[#00d4ff] bg-[#0a0e1a] h-screen">
        <Loader2 className="animate-spin mb-4" size={48} />
        <span className="font-black tracking-[0.3em] uppercase text-xs">Chargement du Système Expert v5.0...</span>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 animate-in fade-in duration-700">
      
      {/* HEADER PROFESSIONNEL */}
      <header className="flex justify-between items-center mb-10 bg-[#111827] p-8 rounded-[40px] border border-slate-800 shadow-2xl">
        <div>
          <h2 className="text-4xl font-black text-white italic flex items-center gap-3">
            <Activity className="text-[#00d4ff]" size={32} /> ANALYTICS <span className="text-[#7b61ff]">CENTER</span>
          </h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">Identification · Scoring · Matrice PxI</p>
        </div>
        <div className="text-right">
            <div className="bg-[#00ff88]/10 text-[#00ff88] px-4 py-1 rounded-full text-[10px] font-black border border-[#00ff88]/20 inline-block mb-2 uppercase">Conformité ISA / NEP</div>
            <p className="text-xl font-black text-white uppercase tracking-tighter">{mission.raison_sociale}</p>
        </div>
      </header>

      {/* NAVIGATION TABS PRO - 5 Onglets pour 100% de conformité */}
      <div className="flex bg-[#111827] p-1.5 rounded-2xl mb-10 w-fit border border-slate-800 mx-auto shadow-2xl">
        {[
          {id: 'STATS', label: 'Dashboard', icon: BarChart3},
          {id: 'CARTO', label: 'Cartographie PxI', icon: Target},
          {id: 'BENFORD', label: 'Loi de Benford', icon: Zap},
          {id: 'ML', label: 'Scoring IA (SHAP)', icon: BrainCircuit}
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-[#1f2a40] text-[#00d4ff] shadow-xl border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <tab.icon size={16}/> {tab.label}
          </button>
        ))}
      </div>

      {/* --- PAGE 1 : STATS --- */}
      {activeTab === 'STATS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-5">
           <div className="lg:col-span-2 bg-[#111827] p-8 rounded-[40px] border border-slate-800 shadow-sm">
              <h3 className="font-black text-white text-[11px] uppercase mb-10 flex items-center gap-2 tracking-widest text-[#00d4ff]">Risques par Cycle d'Audit</h3>
              <Plot
                data={[
                  { x: Object.keys(stats.distribution), y: Object.keys(stats.distribution).map(k => stats.distribution[k].Faible), type: 'bar', name: 'FAIBLE', marker: {color: '#16A34A'} },
                  { x: Object.keys(stats.distribution), y: Object.keys(stats.distribution).map(k => stats.distribution[k].Eleve), type: 'bar', name: 'MAJEUR', marker: {color: '#DC2626'} }
                ]}
                layout={{ barmode: 'stack', height: 400, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: {color: '#64748b'}, margin: {t:0}, xaxis: {gridcolor:'#1f2a40'}, yaxis: {gridcolor:'#1f2a40'} }}
                style={{ width: "100%" }} config={{ displayModeBar: false }}
              />
           </div>
           <div className="space-y-6">
              <div className="bg-[#111827] p-8 rounded-[40px] border border-slate-800 shadow-xl">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Matérialité (ISA 320)</p>
                <p className="text-4xl font-black text-white mt-2">{mission.seuil_signification?.toLocaleString()} €</p>
              </div>
              <div className="bg-[#0f172a] p-8 rounded-[40px] border border-slate-800 shadow-xl border-l-4 border-l-[#ff4f4f]">
                <p className="text-[10px] font-black text-[#ff4f4f] uppercase tracking-widest">Impact Total Détecté</p>
                <p className="text-4xl font-black text-white mt-2">{stats.impact_total?.toLocaleString()} €</p>
              </div>
           </div>
        </div>
      )}

      {/* --- PAGE 2 : CARTOGRAPHIE --- */}
      {activeTab === 'CARTO' && (
        <div className="bg-[#111827] p-10 rounded-[50px] border border-slate-800 shadow-2xl animate-in zoom-in">
           <Plot
            data={[{
              x: stats.cartographie.map(c => c.x),
              y: stats.cartographie.map(c => c.y),
              mode: 'markers+text', type: 'scatter',
              text: stats.cartographie.map(c => c.label),
              textposition: 'top center',
              marker: { 
                  size: stats.cartographie.map(c => c.size), 
                  color: stats.cartographie.map(c => c.montant > mission.seuil_signification ? '#DC2626' : '#00d4ff'),
                  opacity: 0.8, line: {width: 2, color: 'white'}
              }
            }]}
            layout={{ 
                xaxis: { title: 'Impact (1-5)', range: [0, 6], gridcolor: '#1f2a40' },
                yaxis: { title: 'Probabilité (1-5)', range: [0, 6], gridcolor: '#1f2a40' },
                height: 500, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: {color: '#64748b'},
                shapes: [{ type: 'rect', x0: 3, y0: 3, x1: 6, y1: 6, fillcolor: 'rgba(220, 38, 38, 0.1)', line: {width: 0} }]
            }}
            style={{ width: "100%" }}
           />
        </div>
      )}

      {/* --- PAGE 3 : BENFORD --- */}
      {activeTab === 'BENFORD' && (
        <div className="bg-[#111827] p-8 rounded-[40px] border border-slate-800 shadow-2xl animate-in fade-in">
          <h3 className="font-black text-white text-[11px] uppercase mb-10 tracking-widest text-[#7b61ff]">Analyse Statistique de Benford (Délit de fraude)</h3>
          <Plot
            data={[
              { x: stats.benford.labels, y: stats.benford.theorique, type: 'bar', name: 'THÉORIQUE', marker: {color: '#1e293b'} },
              { x: stats.benford.labels, y: stats.benford.reel, type: 'scatter', mode: 'lines+markers', name: 'RÉEL DÉTECTÉ', line: {color: '#7b61ff', width: 4} }
            ]}
            layout={{ height: 400, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: {color: '#64748b'}, xaxis: {gridcolor:'#1f2a40'}, yaxis: {gridcolor:'#1f2a40'} }}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* --- PAGE 4 : PERFORMANCE ML (Radar & SHAP) --- */}
      {activeTab === 'ML' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-right-5">
           <div className="bg-[#111827] p-8 rounded-[40px] border border-slate-800">
              <h3 className="font-black text-[#00ff88] text-[11px] uppercase mb-6 tracking-widest text-center">Radar de Confiance Modèle</h3>
              <Plot
                data={[{
                  type: 'scatterpolar', r: stats.radar,
                  theta: ['Précision', 'Rappel', 'F1-Score', 'AUC-ROC', 'Spécif.'],
                  fill: 'toself', fillcolor: 'rgba(0, 255, 136, 0.1)', line: { color: '#00ff88', width: 3 }
                }]}
                layout={{ polar: { bgcolor: 'rgba(0,0,0,0)', radialaxis: { visible: true, range: [0, 100], gridcolor: '#1f2a40' } }, height: 350, paper_bgcolor: 'rgba(0,0,0,0)' }}
                style={{ width: "100%" }}
              />
           </div>
           <div className="bg-[#111827] p-8 rounded-[40px] border border-slate-800 shadow-sm">
              <h3 className="font-black text-[#00d4ff] text-[11px] uppercase mb-10 tracking-widest text-center">Variables Décisives (Valeurs SHAP)</h3>
              <Plot
                data={[{
                  y: stats.shap.map(s => s.name), x: stats.shap.map(s => s.value),
                  type: 'bar', orientation: 'h', marker: { color: '#00d4ff' }
                }]}
                layout={{ height: 350, paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: {color: '#64748b'}, margin: {l:120} }}
                style={{ width: "100%" }}
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default DashboardAnalyticsView;