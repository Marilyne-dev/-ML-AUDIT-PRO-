import React, { useState, useEffect } from 'react';
import { CYCLES_DATA } from './cyclesData';
import { Shield, AlertCircle, CheckSquare, Upload, FileCheck, Activity, List } from 'lucide-react';
import axios from 'axios';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const CycleDetailView = ({ cycleId, mission, session, checklist, setChecklist }) => {
  const data = CYCLES_DATA[cycleId];
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [cycleAnomalies, setCycleAnomalies] = useState([]);

  // Charger les anomalies du cycle au démarrage ou quand on change de cycle
  useEffect(() => {
    if (mission && cycleId) fetchCycleData();
  }, [cycleId, mission]);

  const fetchCycleData = async () => {
    try {
      const res = await axios.get(`${API_URL}/anomalies/${mission.id}/${cycleId}`);
      setCycleAnomalies(res.data || []);
    } catch (e) { console.error("Erreur chargement anomalies cycle", e); }
  };

  const toggleCheck = (index) => {
    const key = `${cycleId}_${index}`;
    setChecklist({ ...checklist, [key]: !checklist[key] });
    // Note : Ici tu peux ajouter un appel axios pour sauver la checklist en base
  };

 const handleCycleImport = async () => {
    if (!file) return alert("Veuillez sélectionner un fichier.");
    setAnalyzing(true);
    
    const formData = new FormData();
    formData.append('files', file);

    try {
      // AJOUT : on passe cycle_id dans l'URL pour que le backend et l'IA soient au courant
      const url = `${API_URL}/analyze/${mission.id}?import_type=DOCS&user_id=${session.user.id}&cycle_id=${cycleId}`;
      
      await axios.post(url, formData);
      await fetchCycleData(); // On recharge les résultats
      
      alert(`Analyse terminée. Les nouveaux constats ont été ajoutés au cycle ${cycleId}.`);
      setFile(null);
    } catch (e) {
      alert("Erreur d'analyse.");
    } finally {
      setAnalyzing(false);
    }
  };
  if (!data) return <div className="p-20 text-center text-slate-400 italic">Sélectionnez un cycle.</div>;

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500 pb-20">
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8 border-b pb-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 italic uppercase">{data.emoji} {data.nom}</h2>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase">
            Référentiel Cycle {cycleId}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* OBJECTIF & CHECKLIST */}
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <h3 className="font-black text-blue-600 text-xs uppercase mb-4 flex items-center gap-2"><Shield size={16}/> Objectif du contrôle</h3>
            <p className="text-slate-600 italic mb-8">"{data.objectif}"</p>

            <h3 className="font-black text-slate-800 text-xs uppercase mb-4 flex items-center gap-2"><CheckSquare size={16}/> Programme de Travail</h3>
            <div className="space-y-2">
              {data.controles.map((c, i) => (
                <div key={i} onClick={() => toggleCheck(i)} className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition ${checklist[`${cycleId}_${i}`] ? 'bg-green-50 border-green-200 border' : 'bg-slate-50 border-transparent border hover:border-slate-200'}`}>
                  <input type="checkbox" checked={!!checklist[`${cycleId}_${i}`]} readOnly className="w-5 h-5 rounded-full text-green-600" />
                  <span className="text-xs font-bold text-slate-700">{c}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NOUVEAU : RÉSULTATS DE L'ANALYSE IA (Ce que tu demandais) */}
          {/* NOUVEAU : RÉSULTATS DE L'ANALYSE IA (Ce que tu demandais) */}
            <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
                
                {/* REMPLACE L'ANCIEN H3 PAR CELUI-CI : */}
                <h3 className="font-black text-orange-600 text-xs uppercase mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2"><List size={16}/> Constats IA & Écarts</div>
                    <div className="bg-orange-100 px-2 py-1 rounded text-orange-700">
                        {cycleAnomalies.length} résultat(s) trouvé(s)
                    </div>
                </h3>

                {cycleAnomalies.length > 0 ? (
                    <div className="space-y-3">
                        {cycleAnomalies.map((anom, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                                <div className="flex-1">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${anom.niveau_criticite === 'CRITIQUE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {anom.niveau_criticite}
                                    </span>
                                    <p className="text-xs font-bold text-slate-700 mt-1">{anom.description}</p>
                                </div>
                                <div className="text-right font-black text-slate-900 text-sm">{anom.montant?.toLocaleString()} €</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-10 text-slate-400 italic text-xs">
                        Aucun écart détecté pour le moment. Importez une pièce pour lancer l'analyse comparative.
                    </div>
                )}
            </div>
        </div>

        {/* SIDEBAR : POINTS DE VIGILANCE & IMPORT */}
        <div className="space-y-6">
          <div className="bg-red-50 p-6 rounded-[30px] border border-red-100">
            <h3 className="font-black text-red-600 text-xs uppercase mb-4 flex items-center gap-2"><AlertCircle size={16}/> Risques Spécifiques</h3>
            <ul className="space-y-3">
              {data.risques_specifiques.map((r, i) => (
                <li key={i} className="text-[10px] font-black text-red-800 leading-tight flex gap-2"><span>•</span> {r}</li>
              ))}
            </ul>
          </div>

          <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl">
            <h3 className="font-black text-blue-400 text-xs uppercase mb-2">Comparer une pièce</h3>
            <p className="text-[10px] text-slate-400 mb-6">L'IA va comparer votre document avec les chiffres de la balance pour trouver des erreurs.</p>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="hidden" id="file-cycle" />
            <label htmlFor="file-cycle" className="block w-full p-4 border-2 border-dashed border-slate-700 rounded-2xl text-center text-[10px] font-bold cursor-pointer hover:border-blue-500 mb-4">
              {file ? file.name : "SÉLECTIONNER UN DOCUMENT"}
            </label>
            <button onClick={handleCycleImport} disabled={analyzing || !file} className="w-full py-4 bg-blue-600 rounded-xl font-black text-xs hover:bg-blue-700 disabled:opacity-50">
              {analyzing ? "ANALYSE IA..." : "LANCER L'ANALYSE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CycleDetailView;