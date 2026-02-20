import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Info, Building2, ShieldAlert } from 'lucide-react';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const KnowledgeView = ({ mission, session }) => {
  const [formData, setFormData] = useState({
    forme_juridique: '', secteur_activite: '', effectif: '', logiciel_comptable: '', risques_generaux: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (mission) fetchExistingKnowledge(); }, [mission]);

  const fetchExistingKnowledge = async () => {
    try {
      const res = await axios.get(`${API_URL}/knowledge/${mission.id}`);
      if (res.data) setFormData(res.data);
    } catch (e) { console.log("Aucune fiche trouvée"); }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/knowledge/${mission.id}?user_id=${session.user.id}`, formData);
      alert("Fiche de connaissance sauvegardée !");
    } catch (e) { alert("Erreur lors de la sauvegarde."); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in slide-in-from-bottom-5 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 italic flex items-center gap-3">
          <Building2 className="text-blue-600" /> 1.1 Fiche de Connaissance Client
        </h2>
        <p className="text-slate-500">Dossier : {mission.raison_sociale}</p>
      </header>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Forme Juridique</label>
            <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 ring-blue-500" 
              value={formData.forme_juridique} onChange={e => setFormData({...formData, forme_juridique: e.target.value})} placeholder="Ex: SAS, SARL..." />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400">Secteur d'activité</label>
            <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 ring-blue-500" 
              value={formData.secteur_activite} onChange={e => setFormData({...formData, secteur_activite: e.target.value})} placeholder="Ex: BTP, Services..." />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Logiciel Comptable utilisé</label>
          <input type="text" className="w-full mt-1 p-3 bg-slate-50 rounded-xl border-none outline-none focus:ring-2 ring-blue-500" 
            value={formData.logiciel_comptable} onChange={e => setFormData({...formData, logiciel_comptable: e.target.value})} placeholder="Ex: Sage, Quadratus..." />
        </div>

        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Analyse des risques généraux</label>
          <textarea className="w-full mt-1 p-4 bg-slate-50 rounded-2xl border-none outline-none focus:ring-2 ring-blue-500 h-32" 
            value={formData.risques_generaux} onChange={e => setFormData({...formData, risques_generaux: e.target.value})} placeholder="Décrivez les points de vigilance généraux..." />
        </div>

        <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition shadow-xl">
          <Save size={18} /> {loading ? "ENREGISTREMENT..." : "SAUVEGARDER LA FICHE"}
        </button>
      </div>
    </div>
  );
};

export default KnowledgeView;