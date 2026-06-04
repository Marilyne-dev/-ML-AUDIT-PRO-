import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Upload, Send, AlertTriangle, CheckCircle, Activity, Clock, FileCheck } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';

axios.defaults.timeout = 30000;

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const CircularisationView = ({ mission, session }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tiersList, setTiersList] = useState([]);

// On récupère les anciennes valeurs si elles existent, sinon valeurs par défaut
  const [typeCircu, setTypeCircu] = useState(localStorage.getItem('circu_type') || "CLIENT");
  const [mode, setMode] = useState(localStorage.getItem('circu_mode') || "FERME");
  
  const [selectedTier, setSelectedTier] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');


  // Sauvegarder les choix dès qu'ils changent
  useEffect(() => {
    localStorage.setItem('circu_type', typeCircu);
    localStorage.setItem('circu_mode', mode);
  }, [typeCircu, mode]);

  // Charger les données au démarrage
  useEffect(() => { if (mission) fetchTiers(); }, [mission]);

  const fetchTiers = async () => {
    try {
      const res = await axios.get(`${API_URL}/circularisation/${mission.id}`);
      setTiersList(res.data || []);
    } catch (e) { console.error("Erreur chargement", e); }
  };

const handleAnalyze = async () => {
    if (!file) return alert("Veuillez sélectionner un fichier.");
    setLoading(true);
    
    // On ne garde que le fichier dans le FormData
    const formData = new FormData();
    formData.append('file', file);

    try {
      // On envoie le user_id, le mode et le type dans l'URL (Query Parameters)
      // C'est beaucoup plus propre pour FastAPI
      // On utilise session.user.id qui est TOUJOURS rempli si on est connecté
        const url = `${API_URL}/circularisation/${mission.id}?type_circu=${typeCircu}&mode=${mode}&user_id=${session.user.id}`;
      
      await axios.post(url, formData);
      
      alert("Analyse réussie !");
      fetchTiers(); 
    } catch (e) { 
      console.error("Erreur technique :", e.response?.data || e.message);
      alert("Erreur lors de l'analyse. Vérifiez la console."); 
    } finally { 
      setLoading(false); 
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.patch(`${API_URL}/circularisation/status/${id}`, { statut: newStatus });
      fetchTiers();
    } catch (e) { alert("Erreur statut"); }
  };

  const handleSendEmail = async () => {
    setSending(true);
    try {
        const res = await axios.post(`${API_URL}/send-email`, {
            destinataire: currentEmail,
            sujet: `Confirmation de solde - ${mission.raison_sociale}`,
            corps: editorContent
        }, { timeout: 30000 });
        if (res.data.success) {
            await updateStatus(selectedTier.id, "ENVOYÉ");
            alert("Email envoyé !");
            setSelectedTier(null);
        }
    } catch (e) {
        const message = e.response?.data?.detail || e.response?.data?.message || e.message || "Erreur envoi";
        alert(message);
    }
    finally { setSending(false); }
  };

  // On ne garde que les tiers qui correspondent au TYPE et au MODE sélectionnés
  const filteredTiers = tiersList.filter(t => t.type === typeCircu && t.mode === mode);

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 italic flex items-center gap-3">
          <Mail className="text-blue-600" /> Circularisation & Suivi
        </h2>
      </header>

      {/* 1. UPLOAD SECTION */}
      <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 mb-8">
        {/* 1. CHOIX DU TYPE & MODE */}
      <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 mb-8">
        <div className="flex flex-wrap gap-4 mb-6 items-center">
            {/* Types */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setTypeCircu("CLIENT")} className={`px-4 py-2 rounded-lg font-bold text-[10px] transition ${typeCircu === 'CLIENT' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>CLIENTS</button>
                <button onClick={() => setTypeCircu("FOURNISSEUR")} className={`px-4 py-2 rounded-lg font-bold text-[10px] transition ${typeCircu === 'FOURNISSEUR' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>FOURNISSEURS</button>
                <button onClick={() => setTypeCircu("BANQUE")} className={`px-4 py-2 rounded-lg font-bold text-[10px] transition ${typeCircu === 'BANQUE' ? 'bg-blue-600 text-white shadow' : 'text-slate-500'}`}>BANQUES</button>
            </div>

            <div className="h-6 w-px bg-slate-200 mx-2"></div>

            {/* Modes */}
            <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setMode("FERME")} className={`px-4 py-2 rounded-lg font-bold text-[10px] transition ${mode === 'FERME' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>MODE FERMÉ (PRIX AFFICHÉ)</button>
                <button onClick={() => setMode("OUVERT")} className={`px-4 py-2 rounded-lg font-bold text-[10px] transition ${mode === 'OUVERT' ? 'bg-slate-800 text-white shadow' : 'text-slate-500'}`}>MODE OUVERT (PRIX MASQUÉ)</button>
            </div>
        </div>

        <div className="flex items-center gap-4 border-t pt-6">
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            <button onClick={handleAnalyze} disabled={loading || !file} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap">
                {loading ? "ANALYSE IA EN COURS..." : "LANCER L'EXTRACTION"}
            </button>
        </div>
      </div>
      </div>

      {/* 2. TABLEAU DE SUIVI (Le coeur du module) */}
      <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-black text-slate-800 flex items-center gap-2"><Activity size={18} className="text-blue-600"/> ÉTAT DES CONFIRMATIONS</h3>
            <span className="text-[10px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full">{tiersList.length} TIERS IDENTIFIÉS</span>
        </div>
        <table className="w-full text-left">
            <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                <tr>
                    <th className="p-4">Tiers / Entreprise</th>
                    <th className="p-4">Solde</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
           <tbody>
            {filteredTiers.length > 0 ? (
                filteredTiers.map((t) => (
                    <tr key={t.id} className="border-b hover:bg-slate-50">
                        {/* ... tout ton code de ligne <tr> existant ... */}
                        <td className="p-4 font-bold text-slate-700">{t.tiers_nom}</td>
                        <td className="p-4 font-mono text-sm">{t.montant?.toLocaleString()} €</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded-md text-[10px] font-black ${
                                t.statut === 'ENVOYÉ' ? 'bg-orange-100 text-orange-600' :
                                t.statut === 'FERMÉ (REÇU)' ? 'bg-green-100 text-green-600' : 
                                t.statut === 'LITIGE' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                                {t.statut}
                            </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <select 
                                value={t.statut}
                                onChange={(e) => updateStatus(t.id, e.target.value)}
                                className="text-[10px] border rounded p-1 outline-none font-bold"
                            >
                                <option value="À PRÉPARER">À PRÉPARER</option>
                                <option value="ENVOYÉ">ENVOYÉ</option>
                                <option value="FERMÉ (REÇU)">REÇU / FERMÉ</option>
                                <option value="LITIGE">LITIGE / ÉCART</option>
                            </select>
                            <button 
                                onClick={() => { setSelectedTier(t); setEditorContent(t.template_mail); setCurrentEmail(t.email); }}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                <Send size={14}/>
                            </button>
                        </td>
                    </tr>
                ))
            ) : (
                <tr>
                    <td colSpan="4" className="p-10 text-center text-slate-400 italic">
                        Aucune donnée extraite pour {typeCircu} en {mode}. <br/>
                        Veuillez importer et analyser un fichier pour cette catégorie.
                    </td>
                </tr>
            )}
        </tbody>
        </table>
      </div>

      {/* 3. MODAL D'ÉDITION EMAIL */}
      {selectedTier && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b flex justify-between items-center">
                      <h3 className="font-black text-xl">Préparer l'envoi : {selectedTier.tiers_nom}</h3>
                      <button onClick={() => setSelectedTier(null)} className="font-bold text-slate-400">FERMER X</button>
                  </div>
                  <div className="p-8 flex-1 overflow-auto space-y-4">
                      <input type="email" value={currentEmail} onChange={e => setCurrentEmail(e.target.value)} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none" placeholder="Email du tiers..." />
                      <Editor
                        apiKey='fb5zbm350n2w99775iydkmdcwohs6cp0ogw0sqgqg3zvf0a5'
                        value={editorContent}
                        onEditorChange={(content) => setEditorContent(content)}
                        init={{ height: 300, menubar: false }}
                      />
                  </div>
                  <div className="p-6 border-t flex justify-end gap-4">
                      <button onClick={() => setSelectedTier(null)} className="font-bold text-slate-500">Annuler</button>
                      <button onClick={handleSendEmail} disabled={sending} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black">
                          {sending ? "Envoi..." : "ENVOYER MAINTENANT"}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CircularisationView;
