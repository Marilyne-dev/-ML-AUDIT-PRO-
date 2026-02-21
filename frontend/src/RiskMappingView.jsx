import React, { useEffect, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';
const Plot = createPlotlyComponent(Plotly);

import { Grid3X3, Loader2 } from 'lucide-react';
import axios from 'axios';

// ... (reste du code identique au précédent, mais avec le nouvel import de Plot)

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const RiskMappingView = ({ mission }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (mission?.id) fetchStats();
  }, [mission]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API_URL}/analytics/stats/${mission.id}`);
      setStats(res.data);
    } catch (e) { console.error("Erreur stats", e); }
    finally { setLoading(false); }
  };

  if (loading || !stats) return (
    <div className="flex flex-col items-center justify-center p-20 text-red-600 font-black italic animate-pulse">
      <Loader2 className="animate-spin mb-4" size={48} />
      GÉNÉRATION DE LA CARTOGRAPHIE...
    </div>
  );

  // Filtrer uniquement les cycles qui ont des anomalies pour la cartographie
  const activeLabels = Object.keys(stats.cartographie).filter(c => stats.cartographie[c].nombre > 0);
  const xProbabilite = activeLabels.map(l => stats.cartographie[l].nombre);
  const yImpact = activeLabels.map(l => stats.cartographie[l].impact);

  return (
    <div className="max-w-6xl mx-auto animate-in zoom-in duration-500 pb-20">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 italic uppercase flex items-center gap-3">
          <Grid3X3 className="text-red-600" /> Cartographie des Risques
        </h2>
        <p className="text-slate-500 font-medium">Positionnement des cycles selon l'Impact Financier et la Fréquence.</p>
      </header>

      <div className="bg-white p-10 rounded-[50px] shadow-2xl border border-slate-100">
        <Plot
          data={[
            {
              x: xProbabilite,
              y: yImpact,
              mode: 'markers+text',
              type: 'scatter',
              text: activeLabels,
              textposition: 'top center',
              textfont: { family: 'Arial Black', size: 12 },
              marker: {
                size: xProbabilite.map(v => v * 15 + 20), // Taille basée sur le nombre
                color: yImpact.map(v => v > mission.seuil_signification ? '#C0392B' : '#F39C12'), // Rouge si dépasse le seuil
                opacity: 0.8,
                line: { width: 3, color: 'white' }
              },
              hovertemplate: "<b>Cycle: %{text}</b><br>Nb Anomalies: %{x}<br>Impact: %{y:,.2f} €<extra></extra>"
            }
          ]}
          layout={{
            title: { text: 'MATRICE IMPACT / PROBABILITÉ', font: { size: 16, color: '#1B3A5C', weight: 'bold' } },
            xaxis: { title: 'NOMBRE D\'ANOMALIES (FRÉQUENCE)', gridcolor: '#f1f5f9', zeroline: false },
            yaxis: { title: 'IMPACT FINANCIER TOTAL (€)', gridcolor: '#f1f5f9', zeroline: false },
            height: 550,
            autosize: true,
            shapes: [
                // Zone Critique (Haut - Droite) en rouge très clair
                { type: 'rect', x0: 2, y0: mission.seuil_signification || 1000, x1: 20, y1: 1000000, fillcolor: 'rgba(231, 76, 60, 0.05)', line: {width: 0} }
            ]
          }}
          style={{ width: "100%" }}
        />
      </div>
      
      <div className="mt-8 grid grid-cols-3 gap-6 text-[10px] font-black uppercase text-center">
          <div className="p-4 bg-green-50 text-green-700 rounded-3xl border border-green-100">Risques Mineurs (Faible impact)</div>
          <div className="p-4 bg-orange-50 text-orange-700 rounded-3xl border border-orange-100">Risques Modérés (À surveiller)</div>
          <div className="p-4 bg-red-50 text-red-700 rounded-3xl border border-red-100">Risques Majeurs (Dépassement de Seuil)</div>
      </div>
    </div>
  );
};

export default RiskMappingView;