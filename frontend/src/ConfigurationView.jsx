// src/ConfigurationView.jsx
import React from 'react';
import { Settings, Save } from 'lucide-react';

const ConfigurationView = () => {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-300">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic flex items-center gap-3">
          <Settings className="text-blue-600" /> Configuration Système
        </h2>
        <p className="text-slate-400 text-sm font-medium">Paramétrez le comportement de l'IA et les seuils d'audit.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Paramètres ML */}
        <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
          <h3 className="font-black text-lg text-slate-800 mb-6 uppercase">Paramètres Machine Learning</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Modèle utilisé</label>
              <select className="w-full mt-1 p-3 bg-slate-50 rounded-xl text-sm font-bold border border-slate-200">
                <option>Random Forest (Optimisé)</option>
                <option>Isolation Forest</option>
                <option>Claude 3.5 Sonnet (LLM)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Sensibilité de détection</label>
              <input type="range" className="w-full mt-2" min="0" max="100" defaultValue="85" />
              <div className="flex justify-between text-xs text-slate-400 font-bold">
                <span>Standard</span>
                <span>Haute (85%)</span>
                <span>Paranoïaque</span>
              </div>
            </div>
          </div>
        </div>

        {/* Seuils Alertes */}
        <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
          <h3 className="font-black text-lg text-slate-800 mb-6 uppercase">Seuils d'Alerte</h3>
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">Seuil TRACFIN (Espèces)</label>
                <input type="number" defaultValue="10000" className="w-24 p-2 bg-slate-50 rounded-lg text-right font-mono text-sm" />
             </div>
             <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">Seuil Smurfing</label>
                <input type="number" defaultValue="9000" className="w-24 p-2 bg-slate-50 rounded-lg text-right font-mono text-sm" />
             </div>
             <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-500 uppercase">Variation N/N-1 critique</label>
                <input type="number" defaultValue="30" className="w-24 p-2 bg-slate-50 rounded-lg text-right font-mono text-sm" />
             </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-blue-700 transition shadow-xl">
            <Save size={18} /> SAUVEGARDER
        </button>
      </div>
    </div>
  );
};

export default ConfigurationView;