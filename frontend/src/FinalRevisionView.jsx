import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ClipboardCheck, ShieldAlert, CheckCircle, Save, BrainCircuit } from 'lucide-react';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const FinalRevisionView = ({ mission, session }) => {
  const [anomalies, setAnomalies] = useState([]);
  const [conclusion, setConclusion] = useState(mission.final_conclusion || '');
  const [loading, setLoading] = useState(false);
  const [iaAdvice, setIaAdvice] = useState('');

  useEffect(() => { fetchAllAnomalies(); }, [mission]);

  const fetchAllAnomalies = async () => {
    const { data } = await axios.get(`${API_URL}/anomalies/${mission.id}/all`); // On va créer cette route
    setAnomalies(data || []);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/missions/${mission.id}`, { final_conclusion: conclusion });
      alert("Conclusion de révision sauvegardée !");
    } catch (e) { alert("Erreur sauvegarde"); }
    finally { setLoading(false); }
  };

  const askIAAdvice = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ia-final-advice/${mission.id}`);
      setIaAdvice(res.data.advice);
    } catch (e) { alert("L'IA n'a pas pu analyser"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in zoom-in duration-500 pb-20">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 italic flex items-center gap-3">
          <ClipboardCheck className="text-blue-600" /> Révision Finale & Synthèse
        </h2>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* RÉSUMÉ DES SEUILS */}
          <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 grid grid-cols-2 gap-4">
             <div className="p-4 bg-blue-50 rounded-2xl">
                <p className="text-[10px] font-black text-blue-400 uppercase">Seuil de Signification</p>
                <p className="text-xl font-black">{mission.seuil_signification?.toLocaleString()} €</p>
             </div>
             <div className="p-4 bg-orange-50 rounded-2xl">
                <p className="text-[10px] font-black text-orange-400 uppercase">Total Anomalies</p>
                <p className="text-xl font-black">{anomalies.reduce((acc, a) => acc + (a.montant || 0), 0).toLocaleString()} €</p>
             </div>
          </div>

          {/* RÉDACTION DE LA CONCLUSION */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <h3 className="font-black text-slate-800 mb-4 uppercase text-sm">Note de synthèse de l'auditeur</h3>
            <textarea 
                className="w-full p-6 bg-slate-50 rounded-3xl h-64 border-none outline-none focus:ring-2 ring-blue-500 text-sm"
                value={conclusion}
                onChange={(e) => setConclusion(e.target.value)}
                placeholder="Rédigez ici votre conclusion finale sur la régularité et la sincérité des comptes..."
            />
            <button onClick={handleSave} className="mt-4 w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition">
                <Save size={18}/> SAUVEGARDER LA RÉVISION
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* ASSISTANT IA POUR L'OPINION */}
          <div className="bg-[#0f172a] p-6 rounded-[40px] text-white shadow-2xl">
            <h3 className="font-black text-blue-400 mb-2 flex items-center gap-2 text-sm"><BrainCircuit size={18}/> AVIS DE L'IA</h3>
            <p className="text-[10px] text-slate-400 mb-6 italic">L'IA analyse le montant total des erreurs par rapport au seuil de signification.</p>
            
            {iaAdvice ? (
                <div className="p-4 bg-slate-800 rounded-2xl text-[11px] leading-relaxed border border-slate-700 animate-in fade-in">
                    {iaAdvice}
                </div>
            ) : (
                <button onClick={askIAAdvice} disabled={loading} className="w-full py-3 bg-blue-600 rounded-xl font-black text-xs hover:bg-blue-700 transition">
                    GÉNÉRER L'AVIS IA
                </button>
            )}
          </div>

          {/* STATUT DES CYCLES (Checklist rapide) */}
          <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-400 text-[10px] uppercase mb-4">Alerte Travaux</h3>
            <div className="flex items-center gap-2 text-green-600 font-bold text-xs">
                <CheckCircle size={14}/> 11 cycles référencés
            </div>
            <div className="mt-4 text-[10px] text-slate-500">
                Vérifiez que toutes les checklists ont été remplies avant de signer.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinalRevisionView;