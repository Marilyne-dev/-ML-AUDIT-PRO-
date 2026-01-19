import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { 
  LayoutDashboard, FileText, AlertTriangle, Users, LogOut, 
  PlusCircle, ShieldCheck, Menu, X, Gavel, Scale, Fingerprint, User, Briefcase 
} from 'lucide-react';

// --- DÉTECTION AUTOMATIQUE (LOCAL vs EN LIGNE) ---
// Si l'adresse dans le navigateur est "localhost", on utilise ton PC.
// Sinon (c'est Vercel), on utilise le serveur Render.
const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000"                // Version Locale
  : "https://ml-audit-pro.onrender.com";   // Version En Ligne (Render)

function App() {
  // --- ÉTATS (STATES) ---
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('client');
  const [isAdminLoginForm, setIsAdminLoginForm] = useState(false);
  
  // Champs mission v4.0
  const [raisonSociale, setRaisonSociale] = useState('');
  const [ca, setCa] = useState('');
  const [resultat, setResultat] = useState('');
  const [bilan, setBilan] = useState('');

  const [missions, setMissions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [file, setFile] = useState(null);
  
  // Gestion précise du chargement par mission
  const [uploadingId, setUploadingId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- CONFIGURATION ADMIN ---
  const ADMIN_EMAILS = ['marilyneambossou@gmail.com', 'contact@rvj-audit.com'];

  // --- 1. SESSION & RÔLES ---
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

  useEffect(() => {
    if (session) fetchMissions();
  }, [session, userRole]);

  // --- 2. ACTIONS DATA ---
  const fetchMissions = async () => {
    const { data } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    setMissions(data || []);
  };

  const fetchAnomalies = async (mission) => {
    setLoading(true);
    setSelectedMission(mission);
    try {
      // Appel au backend (Local ou Render selon l'environnement)
      console.log("Appel API vers :", `${API_URL}/anomalies/${mission.id}`);
      
      // On tente d'abord Supabase direct pour être sûr de récupérer les données stockées
      const { data, error } = await supabase.from('anomalies').select('*').eq('mission_id', mission.id);
      
      if (error) throw error;
      setAnomalies(data || []);
      setActiveTab('alerts');
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la récupération des données.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (type) => {
    if (!email || !password) return alert("Veuillez remplir tous les champs.");
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert(error.message);
        setLoading(false);
    } else {
        setLoading(false);
    }
  };

  const createMission = async () => {
    if (!raisonSociale || !ca) return alert("Raison sociale et CA obligatoires.");
    setLoading(true);
    try {
      console.log("Création mission vers :", API_URL);
      await axios.post(`${API_URL}/missions`, {
        raison_sociale: raisonSociale,
        chiffre_affaires_n: parseFloat(ca),
        resultat_net_n: parseFloat(resultat || 0),
        total_bilan: parseFloat(bilan || 0),
        client_email: session.user.email
      });
      alert("Mission créée avec succès !");
      setRaisonSociale(''); setCa(''); setResultat(''); setBilan('');
      fetchMissions();
    } catch (e) {
      console.error(e);
      alert("Erreur création. Si vous êtes en local, vérifiez 'uvicorn'. Si en ligne, vérifiez Render.");
    } finally { 
        setLoading(false); 
    }
  };

  const handleUpload = async (missionId) => {
    if (!file) return alert("Veuillez d'abord choisir un fichier pour cette mission.");
    
    setUploadingId(missionId); 
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log(`Envoi du fichier vers ${API_URL}/analyze/${missionId}`);
      const res = await axios.post(`${API_URL}/analyze/${missionId}`, formData);
      
      alert(`Expertise IA terminée : ${res.data.anomalies_detectees} anomalies trouvées.`);
      
      setFile(null); 
      fetchMissions(); 
    } catch (e) {
      console.error("Erreur détaillée:", e);
      alert("Erreur lors de l'analyse : " + (e.response?.data?.detail || "Le serveur ne répond pas."));
    } finally {
      setUploadingId(null);
    }
  };

  // --- ÉCRAN DE CONNEXION ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans text-white">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <ShieldCheck size={50} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tighter">ML-AUDIT PRO</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">RVJ Audit & Expertise - v4.0</p>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-2xl mb-6 border border-slate-700">
            <button onClick={() => setIsAdminLoginForm(false)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition ${!isAdminLoginForm ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>
              <User size={18}/> Client
            </button>
            <button onClick={() => setIsAdminLoginForm(true)} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition ${isAdminLoginForm ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400'}`}>
              <Briefcase size={18}/> Auditeur
            </button>
          </div>

          <div className="bg-[#1e293b] p-8 rounded-[40px] shadow-2xl border border-slate-700">
            <h2 className="text-xl font-bold mb-6 text-center">{isAdminLoginForm ? 'Espace Auditeur' : 'Espace Client'}</h2>
            <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-2xl bg-slate-700 outline-none border border-transparent focus:border-blue-500" onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-8 rounded-2xl bg-slate-700 outline-none border border-transparent focus:border-blue-500" onChange={e => setPassword(e.target.value)} />
            <button disabled={loading} onClick={() => handleAuth('login')} className={`w-full p-4 rounded-2xl font-black text-lg transition ${isAdminLoginForm ? 'bg-slate-600 hover:bg-slate-500' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {loading ? "TRAITEMENT..." : "SE CONNECTER"}
            </button>
            {!isAdminLoginForm && (
                <button onClick={() => handleAuth('signup')} className="w-full text-slate-500 text-xs mt-6 hover:text-white transition">Créer un compte entreprise</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER MOBILE */}
      <div className="lg:hidden bg-[#0f172a] text-white p-4 flex justify-between items-center shadow-xl">
        <h1 className="font-black italic flex items-center gap-2"><ShieldCheck className="text-blue-400"/> ML-AUDIT 4.0</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-slate-800 rounded-lg">
            {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* SIDEBAR RESPONSIVE */}
      <div className={`${isMenuOpen ? 'fixed inset-0' : 'hidden'} lg:relative lg:flex w-full lg:w-80 bg-[#0f172a] text-white p-6 flex-col shadow-2xl z-50`}>
        <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
          <div className="bg-blue-600 p-2 rounded-xl"><ShieldCheck size={28}/></div>
          <h1 className="text-xl font-black uppercase tracking-tighter leading-none">ML-Audit<br/><span className="text-blue-400 text-sm">PRO v4.0</span></h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => {setActiveTab('dashboard'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={20}/> Dashboard
          </button>
          <button onClick={() => {setActiveTab('missions'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'missions' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
            <Users size={20}/> {userRole === 'admin' ? 'Portefeuille Clients' : 'Mes Missions'}
          </button>
          {userRole === 'admin' && (
            <button onClick={() => {setActiveTab('alerts'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'alerts' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
                <AlertTriangle size={20}/> Détection de Risques
            </button>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="bg-slate-800 p-4 rounded-2xl mb-4">
             <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Session active</p>
             <p className="text-xs font-bold text-blue-400 truncate">{session.user.email}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-4 hover:bg-red-900/10 rounded-2xl w-full transition font-black">
            <LogOut size={20}/> DÉCONNEXION
          </button>
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 p-4 sm:p-10 lg:p-16 overflow-auto">
        
        {activeTab === 'dashboard' && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter italic">Tableau de Bord Augmented Audit</h2>
                    <p className="text-slate-400 font-medium">Cabinet RVJ Audit & Expertise - Fort-de-France</p>
                </div>
                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-black uppercase">Statut : Connecté {userRole}</div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-12">
                <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                    <p className="text-blue-400 font-bold text-xs uppercase mb-2">Missions Actives</p>
                    <p className="text-7xl font-black">{missions.length}</p>
                    <Fingerprint className="absolute right-[-20px] bottom-[-20px] text-white/5" size={180} />
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-400 mb-4"><Scale size={18}/> <span className="text-xs font-bold uppercase">Seuil de Signification (ISA 320)</span></div>
                    <p className="text-3xl font-black text-slate-900">
                        {missions[0]?.seuil_signification ? `${missions[0].seuil_signification.toLocaleString()} €` : "En attente"}
                    </p>
                    <p className="text-slate-400 text-[10px] mt-2 italic">Calculé sur 1% du Chiffre d'Affaires</p>
                </div>

                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-slate-400 mb-4"><Gavel size={18}/> <span className="text-xs font-bold uppercase">Opinion IA Recommandée</span></div>
                    <div className="bg-green-50 text-green-700 p-4 rounded-2xl font-black text-sm text-center border border-green-100">
                        CERTIFICATION SANS RÉSERVE
                    </div>
                </div>
            </div>

            {userRole === 'client' && (
              <div className="bg-white p-6 sm:p-12 rounded-[50px] shadow-xl border border-slate-100 mb-12">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><PlusCircle className="text-blue-600"/> Nouvelle Mission d'Audit v4.0</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Raison Sociale de l'Entité</label>
                    <input type="text" placeholder="Ex: RVJ Audit" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500 transition" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Chiffre d'Affaires N (Euros)</label>
                    <input type="number" placeholder="Ex: 1000000" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500 transition" value={ca} onChange={e => setCa(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Résultat Net N (Euros)</label>
                    <input type="number" placeholder="Ex: 50000" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500 transition" value={resultat} onChange={e => setResultat(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-2 tracking-widest">Total Bilan (Euros)</label>
                    <input type="number" placeholder="Ex: 2000000" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500 transition" value={bilan} onChange={e => setBilan(e.target.value)} />
                  </div>
                </div>
                <button disabled={loading} onClick={createMission} className="w-full mt-10 bg-blue-600 text-white p-5 rounded-3xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition disabled:bg-slate-400">
                    {loading ? "GÉNÉRATION DU DOSSIER EN COURS..." : "LANCER LA MISSION D'AUDIT"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <h2 className="text-3xl font-black mb-8 italic flex items-center gap-3"><Users className="text-blue-600"/> Portefeuille Actif</h2>
            {missions.map(m => (
              <div key={m.id} className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <h4 className="font-black text-2xl text-slate-900">{m.raison_sociale}</h4>
                  <div className="flex flex-wrap gap-4 mt-2">
                    <span className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase tracking-widest">CA: {m.chiffre_affaires_n?.toLocaleString()} €</span>
                    <span className="text-[10px] font-bold bg-blue-50 px-3 py-1 rounded-full text-blue-600 uppercase tracking-widest text-xs">Seuil: {m.seuil_signification?.toLocaleString()} €</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {userRole === 'client' && (
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-3xl border border-slate-200">
                      <input type="file" className="text-[10px]" onChange={(e) => setFile(e.target.files[0])} />
                      <button 
                        disabled={uploadingId === m.id} 
                        onClick={() => handleUpload(m.id)} 
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase transition disabled:bg-slate-400"
                      >
                        {uploadingId === m.id ? "IA EN COURS..." : "UPLOADER LE FEC"}
                      </button>
                    </div>
                  )}
                  {userRole === 'admin' && (
                    <button disabled={loading} onClick={() => fetchAnomalies(m)} className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase hover:bg-black transition shadow-lg">
                        {loading ? "CHARGEMENT..." : "VÉRIFIER 21 CYCLES IA"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="animate-in fade-in duration-500 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-3xl font-black text-slate-900 italic">Analyse des Risques : {selectedMission?.raison_sociale}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Classification Random Forest & Test de Benford</p>
                </div>
                <button onClick={() => setActiveTab('missions')} className="text-blue-600 font-black text-xs uppercase underline">Retour au portefeuille</button>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-[#0f172a] text-white">
                            <tr>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Criticité</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Cycle d'Audit</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest">Anomalie Détectée</th>
                                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right">Impact (€)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {anomalies.map((a, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50 transition border-slate-100">
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                                        a.niveau_criticite === 'CRITIQUE' ? 'bg-red-600 text-white shadow-lg' : 'bg-orange-400 text-white shadow-md'
                                    }`}>
                                        {a.niveau_criticite}
                                    </span>
                                </td>
                                <td className="p-6 font-black text-slate-700 uppercase text-xs tracking-tighter">{a.cycle}</td>
                                <td className="p-6">
                                    <div className="text-sm font-bold text-slate-900">{a.type_anomalie}</div>
                                    <div className="text-[11px] text-slate-400 max-w-md">{a.description}</div>
                                </td>
                                <td className="p-6 text-right font-mono font-black text-blue-600">
                                    {a.montant > 0 ? `${a.montant.toLocaleString()} €` : "--"}
                                </td>
                            </tr>
                            ))}
                            {anomalies.length === 0 && (
                                <tr><td colSpan="4" className="p-32 text-center text-slate-300 font-black uppercase italic tracking-widest">Rien à signaler par l'Intelligence Artificielle</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-10 p-8 bg-blue-50 rounded-[40px] border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Impact Cumulé</p>
                    <p className="text-4xl font-black text-blue-900">
                        {anomalies.reduce((sum, a) => sum + (a.montant || 0), 0).toLocaleString()} €
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">Statut Continuité</p>
                    <p className="text-sm font-black text-green-600 uppercase border-b-2 border-green-600 inline-block">Favorable (Going Concern OK)</p>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;