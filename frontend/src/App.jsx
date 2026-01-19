import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { 
  LayoutDashboard, AlertTriangle, Users, LogOut, Download,
  PlusCircle, ShieldCheck, Menu, X, Gavel, Scale, Fingerprint, User, Briefcase, 
  CheckCircle, FileText, Eye
} from 'lucide-react';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000"
  : "https://ml-audit-pro.onrender.com";

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('client');
  const [isAdminLoginForm, setIsAdminLoginForm] = useState(false);
  
  const [raisonSociale, setRaisonSociale] = useState('');
  const [exercice, setExercice] = useState(new Date().getFullYear().toString());
  const [ca, setCa] = useState('');
  const [resultat, setResultat] = useState('');
  const [bilan, setBilan] = useState('');

  const [missions, setMissions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [file, setFile] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const ADMIN_EMAILS = ['marilyneambossou@gmail.com', 'contact@rvj-audit.com'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkUser(session.user);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkUser(session.user);
    });
  }, []);

  const checkUser = (user) => {
    if (ADMIN_EMAILS.includes(user.email)) setUserRole('admin');
    else setUserRole('client');
  };

  useEffect(() => { if (session) fetchMissions(); }, [session, userRole]);

  const fetchMissions = async () => {
    const { data } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    setMissions(data || []);
  };

  const fetchAnomalies = async (mission) => {
    setLoading(true);
    setSelectedMission(mission);
    try {
      const { data } = await supabase.from('anomalies').select('*').eq('mission_id', mission.id);
      setAnomalies(data || []);
      setActiveTab('alerts');
    } catch (e) { alert("Erreur données."); } finally { setLoading(false); }
  };

  // --- CORRECTION : TÉLÉCHARGEMENT & COMPTEUR INSTANTANÉ ---
  const handleDownloadReport = async () => {
    if (!selectedMission) return;

    // 1. Mise à jour Backend ET Frontend (Mise à jour visuelle immédiate)
    try {
        const res = await axios.post(`${API_URL}/track-download/${selectedMission.id}`);
        
        if (res.data.success) {
            // Astuce : On met à jour la liste locale sans attendre le serveur pour que l'oeil voie le changement
            const newCount = res.data.new_count;
            setMissions(prevMissions => prevMissions.map(m => 
                m.id === selectedMission.id ? { ...m, download_count: newCount } : m
            ));
        }
    } catch (e) {
        console.error("Erreur tracking", e);
    }

    // 2. Génération EXACTE selon ton modèle
    let content = `RAPPORT D'AUDIT LÉGAL - ML-AUDIT PRO v4.0\n`;
    content += `=================================================\n`;
    content += `CLIENT : ${selectedMission.raison_sociale.toUpperCase()}\n`;
    content += `DATE   : ${new Date().toLocaleDateString()} à ${new Date().toLocaleTimeString()}\n`;
    content += `STATUT : ${anomalies.length > 0 ? "RISQUE ÉLEVÉ / ANOMALIES DÉTECTÉES" : "CONFORME / RAS"}\n`;
    content += `=================================================\n\n`;

    if (anomalies.length === 0) {
        content += "Aucune anomalie significative n'a été détectée.\n";
    } else {
        content += `DÉTAIL DES ${anomalies.length} ANOMALIES IDENTIFIÉES :\n\n`;
        anomalies.forEach((a, index) => {
            content += `ANOMALIE #${index + 1}\n`;
            content += `- Type      : ${a.type_anomalie} (${a.niveau_criticite})\n`;
            content += `- Cycle     : ${a.cycle}\n`;
            content += `- Montant   : ${a.montant ? a.montant.toLocaleString() + ' €' : '0 €'}\n`;
            content += `- Analyse IA: ${a.description}\n`;
            content += `-------------------------------------------------\n`;
        });
        
        const total = anomalies.reduce((sum, a) => sum + (a.montant || 0), 0);
        content += `\nIMPACT FINANCIER TOTAL : ${total.toLocaleString()} €\n\n`;
    }

    content += `\nCe document a été généré automatiquement par le système expert ML-AUDIT PRO.\n`;
    content += `Il doit être validé par un Commissaire aux Comptes humain.`;

    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `RAPPORT_${selectedMission.raison_sociale.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleAuth = async (type) => {
    if (!email || !password) return alert("Champs vides.");
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const createMission = async () => {
    if (!raisonSociale || !ca) return alert("Infos manquantes.");
    setLoading(true);
    try {
      await axios.post(`${API_URL}/missions`, {
        raison_sociale: raisonSociale,
        exercice_comptable: exercice,
        chiffre_affaires_n: parseFloat(ca),
        resultat_net_n: parseFloat(resultat || 0),
        total_bilan: parseFloat(bilan || 0),
        client_email: session.user.email
      });
      alert("Dossier créé !");
      setRaisonSociale(''); setCa(''); setResultat(''); setBilan('');
      fetchMissions();
    } catch (e) { alert("Erreur création."); } finally { setLoading(false); }
  };

  const handleUpload = async (mission) => {
    if (!file) return alert("Fichier manquant.");
    setUploadingId(mission.id); 
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/analyze/${mission.id}`, formData);
      await fetchMissions();
      await fetchAnomalies(mission);
      setFile(null); 
    } catch (e) {
      alert("Erreur analyse: " + (e.response?.data?.detail || "Serveur HS"));
    } finally { setUploadingId(null); }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white font-sans">
        <div className="max-w-md w-full text-center">
            <ShieldCheck size={50} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-black mb-6">ML-AUDIT PRO</h1>
            <div className="flex bg-slate-800 p-1 rounded-2xl mb-6">
                <button onClick={() => setIsAdminLoginForm(false)} className={`flex-1 py-3 rounded-xl font-bold ${!isAdminLoginForm ? 'bg-blue-600' : 'text-slate-400'}`}>Client</button>
                <button onClick={() => setIsAdminLoginForm(true)} className={`flex-1 py-3 rounded-xl font-bold ${isAdminLoginForm ? 'bg-slate-700' : 'text-slate-400'}`}>Auditeur</button>
            </div>
            <div className="bg-[#1e293b] p-8 rounded-[30px] shadow-2xl">
                <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-xl bg-slate-700 outline-none" onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-6 rounded-xl bg-slate-700 outline-none" onChange={e => setPassword(e.target.value)} />
                <button disabled={loading} onClick={() => handleAuth('login')} className="w-full p-4 rounded-xl font-black bg-blue-600 hover:bg-blue-700">{loading ? "..." : "CONNEXION"}</button>
                {!isAdminLoginForm && <button onClick={() => handleAuth('signup')} className="w-full text-xs mt-4 text-slate-400">Créer un compte</button>}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      
      <div className={`${isMenuOpen ? 'fixed inset-0' : 'hidden'} lg:relative lg:flex w-full lg:w-80 bg-[#0f172a] text-white p-6 flex-col shadow-2xl z-50`}>
        <div className="hidden lg:flex items-center gap-3 mb-8">
            <div className="bg-blue-600 p-2 rounded-xl"><ShieldCheck size={28}/></div>
            <div><h1 className="font-black text-lg leading-none">ML-AUDIT<br/><span className="text-blue-400 text-sm">PRO v4.0</span></h1></div>
        </div>

        <div className="mb-8 px-4 py-3 bg-slate-800 rounded-2xl border border-slate-700">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Connecté en tant que</p>
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-black uppercase ${userRole === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {userRole === 'admin' ? <Briefcase size={12}/> : <User size={12}/>}
                {userRole === 'admin' ? 'ADMINISTRATEUR' : 'CLIENT'}
            </div>
            <p className="text-xs text-slate-300 mt-2 truncate">{session.user.email}</p>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20}/> Tableau de Bord</button>
          <button onClick={() => setActiveTab('missions')} className={`w-full text-left p-4 rounded-xl flex items-center gap-3 ${activeTab === 'missions' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Users size={20}/> Dossiers</button>
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-4 hover:bg-slate-800 rounded-xl font-black mt-auto"><LogOut size={20}/> DÉCONNEXION</button>
      </div>

      <div className="flex-1 p-4 sm:p-10 lg:p-16 overflow-auto">
        <div className="lg:hidden mb-6 flex justify-between items-center">
            <h1 className="font-black italic text-xl flex items-center gap-2"><ShieldCheck className="text-blue-600"/> ML-AUDIT</h1>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-200 rounded-lg"><Menu /></button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic mb-8">Tableau de Bord</h2>
            {userRole === 'admin' ? (
                <div className="bg-white rounded-[30px] shadow-lg border border-slate-100 overflow-hidden">
                    <div className="p-6 bg-slate-900 text-white font-bold flex justify-between items-center">
                        <span>Suivi Global Cabinet</span>
                        <span className="bg-blue-600 px-3 py-1 rounded-full text-xs">{missions.length} dossiers</span>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-black">
                            <tr><th className="p-4">Client</th><th className="p-4">Exercice</th><th className="p-4">CA (N)</th><th className="p-4 text-center">Téléchargements</th><th className="p-4 text-right">Détails</th></tr>
                        </thead>
                        <tbody>
                            {missions.map(m => (
                                <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="p-4 font-bold">{m.raison_sociale}</td>
                                    <td className="p-4 text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold">{m.exercice_comptable || 'N/A'}</span></td>
                                    <td className="p-4 text-slate-500">{m.chiffre_affaires_n?.toLocaleString()} €</td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full font-black text-slate-700">
                                            <Eye size={14}/> {m.download_count || 0}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right"><button onClick={() => fetchAnomalies(m)} className="text-blue-600 font-bold text-xs underline">Voir</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                        <p className="text-blue-400 font-bold text-xs uppercase mb-2">Mes Audits</p>
                        <p className="text-7xl font-black">{missions.length}</p>
                    </div>
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                        <p className="font-bold text-xs uppercase text-slate-400 mb-4 flex items-center gap-2"><PlusCircle size={14}/> Créer une nouvelle mission</p>
                        <div className="space-y-3">
                            <div className="flex gap-3">
                                <input type="text" placeholder="Raison Sociale" className="flex-1 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
                                <input type="text" placeholder="Exercice (ex: 2024)" className="w-1/3 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100" value={exercice} onChange={e => setExercice(e.target.value)} />
                            </div>
                            <div className="flex gap-3">
                                <input type="number" placeholder="CA (N)" className="flex-1 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100" value={ca} onChange={e => setCa(e.target.value)} />
                                <input type="number" placeholder="Résultat Net" className="flex-1 p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100" value={resultat} onChange={e => setResultat(e.target.value)} />
                            </div>
                            <input type="number" placeholder="Total Bilan" className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 ring-blue-100" value={bilan} onChange={e => setBilan(e.target.value)} />
                            <button disabled={loading} onClick={createMission} className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 mt-2">CALCULER SEUILS & CRÉER</button>
                        </div>
                    </div>
                </div>
            )}
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-black mb-8 italic flex items-center gap-3"><Briefcase className="text-blue-600"/> {userRole === 'admin' ? 'Portefeuille Clients' : 'Mes Dossiers'}</h2>
            {missions.map(m => (
              <div key={m.id} className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-black text-xl text-slate-900">{m.raison_sociale}</h4>
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">Ex: {m.exercice_comptable}</span>
                  </div>
                  <div className="flex gap-3 mt-2">
                    {m.statut === 'Analysée' 
                        ? <span className="text-[10px] font-bold bg-green-100 text-green-700 px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle size={12}/> Analysé</span> 
                        : <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">En attente FEC</span>
                    }
                    {userRole === 'admin' && (
                        <span className="text-[10px] font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center gap-1"><Eye size={12}/> Vu {m.download_count} fois</span>
                    )}
                  </div>
                </div>
                <div className="flex gap-3">
                  {m.statut === 'Analysée' ? (
                      <button onClick={() => fetchAnomalies(m)} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold text-xs hover:bg-blue-600 transition">RÉSULTATS</button>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <input type="file" className="text-[10px]" onChange={(e) => setFile(e.target.files[0])} />
                        <button disabled={uploadingId === m.id} onClick={() => handleUpload(m)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-xs disabled:opacity-50">
                            {uploadingId === m.id ? "..." : "UPLOAD"}
                        </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && selectedMission && (
          <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-3xl font-black italic">Rapport : {selectedMission.raison_sociale}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase">Exercice {selectedMission.exercice_comptable} • Audit Légal v4.0</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleDownloadReport} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2">
                        <Download size={18}/> TÉLÉCHARGER LE RAPPORT
                    </button>
                    <button onClick={() => setActiveTab('missions')} className="bg-slate-200 px-4 py-3 rounded-xl text-slate-700 font-bold text-sm">RETOUR</button>
                </div>
            </div>

            <div className={`p-8 rounded-[30px] mb-8 text-white shadow-xl flex items-center gap-6 ${anomalies.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                <div className="bg-white/20 p-4 rounded-full">{anomalies.length > 0 ? <AlertTriangle size={40}/> : <CheckCircle size={40}/>}</div>
                <div>
                    <h2 className="text-2xl font-black uppercase">{anomalies.length > 0 ? "RISQUE DE FRAUDE DÉTECTÉ" : "AUCUNE ANOMALIE DÉTECTÉE"}</h2>
                    <p className="opacity-90 font-medium">{anomalies.length > 0 ? `${anomalies.length} anomalies trouvées.` : "Dossier conforme."}</p>
                </div>
            </div>

            {anomalies.length > 0 && (
                <div className="bg-white rounded-[30px] shadow-lg border border-slate-100 overflow-hidden mb-8">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs uppercase font-black">
                            <tr><th className="p-6">Niveau</th><th className="p-6">Type</th><th className="p-6">Description IA</th><th className="p-6 text-right">Montant</th></tr>
                        </thead>
                        <tbody>
                            {anomalies.map((a, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="p-6"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${a.niveau_criticite === 'CRITIQUE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{a.niveau_criticite}</span></td>
                                <td className="p-6 font-bold text-sm text-slate-700">{a.type_anomalie}</td>
                                <td className="p-6 text-sm text-slate-600 max-w-lg">{a.description}</td>
                                <td className="p-6 text-right font-mono font-black">{a.montant?.toLocaleString()} €</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;