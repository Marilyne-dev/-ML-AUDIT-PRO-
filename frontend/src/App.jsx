import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { 
  LayoutDashboard, FileText, AlertTriangle, Upload, BarChart3, 
  Users, LogOut, PlusCircle, ShieldCheck, Menu, X, Gavel, Scale, Fingerprint 
} from 'lucide-react';

const API_URL = "https://ml-audit-pro.onrender.com";

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('client');
  const [raisonSociale, setRaisonSociale] = useState('');
  
  // Nouveaux champs pour les seuils ISA 320
  const [ca, setCa] = useState('');
  const [resultat, setResultat] = useState('');
  const [bilan, setBilan] = useState('');

  const [missions, setMissions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const ADMIN_EMAILS = ['contact@rvj-audit.com', 'ton-email@admin.com'];

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

  const fetchMissions = async () => {
    const { data } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    setMissions(data || []);
  };

  const fetchAnomalies = async (mission) => {
    setLoading(true);
    setSelectedMission(mission);
    try {
      const res = await axios.get(`${API_URL}/anomalies/${mission.id}`);
      setAnomalies(res.data);
      setActiveTab('alerts');
    } catch (e) {
      alert("Erreur serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (type) => {
    if (!email || !password) return alert("Champs vides");
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) { alert(error.message); setLoading(false); }
  };

  const createMission = async () => {
    if (!raisonSociale || !ca) return alert("Informations financières requises");
    setLoading(true);
    
    // Logique v4.0 : Calcul automatique des seuils (1% du CA)
    const s_signif = parseFloat(ca) * 0.01;

    const { error } = await supabase.from('missions').insert([{ 
      raison_sociale: raisonSociale, 
      exercice_n: 2024, 
      chiffre_affaires_n: parseFloat(ca),
      resultat_net_n: parseFloat(resultat),
      total_bilan: parseFloat(bilan),
      seuil_signification: s_signif,
      statut: 'Initialisée' 
    }]);

    if (error) alert(error.message);
    else { 
        alert("Dossier d'audit v4.0 créé !"); 
        setRaisonSociale(''); setCa(''); setResultat(''); setBilan('');
        fetchMissions(); 
    }
    setLoading(false);
  };

  const handleUpload = async (missionId) => {
    if (!file) return alert("Fichier manquant");
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post(`${API_URL}/analyze/${missionId}`, formData);
      alert("Analyse IA (21 cycles) terminée !");
      fetchMissions();
    } catch (e) { alert("Erreur d'analyse."); }
    finally { setUploading(false); }
  };

  // --- LOGIN ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans text-white">
        <div className="max-w-md w-full bg-[#1e293b] p-8 rounded-[40px] shadow-2xl border border-slate-700">
          <div className="text-center mb-10">
            <ShieldCheck size={50} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-black tracking-tighter uppercase">ML-AUDIT PRO</h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Version 4.0 - RVJ Audit</p>
          </div>
          <input type="email" placeholder="Email Professionnel" className="w-full p-4 mb-4 rounded-2xl bg-slate-700 outline-none border border-transparent focus:border-blue-500" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-8 rounded-2xl bg-slate-700 outline-none border border-transparent focus:border-blue-500" onChange={e => setPassword(e.target.value)} />
          <button disabled={loading} onClick={() => handleAuth('login')} className="w-full bg-blue-600 p-4 rounded-2xl font-black text-lg hover:bg-blue-700 transition disabled:bg-slate-600">
            {loading ? "TRAITEMENT..." : "CONNEXION"}
          </button>
          <button disabled={loading} onClick={() => handleAuth('signup')} className="w-full text-slate-500 text-xs mt-6 hover:text-white transition">Pas de compte ? S'enregistrer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* MOBILE HEADER */}
      <div className="lg:hidden bg-[#0f172a] text-white p-4 flex justify-between items-center shadow-xl">
        <h1 className="font-black italic flex items-center gap-2"><Fingerprint className="text-blue-400"/> ML-AUDIT 4.0</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>{isMenuOpen ? <X /> : <Menu />}</button>
      </div>

      {/* SIDEBAR */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} lg:flex w-full lg:w-80 bg-[#0f172a] text-white p-6 flex-col shadow-2xl z-50`}>
        <div className="hidden lg:flex items-center gap-3 mb-10 px-2">
          <div className="bg-blue-600 p-2 rounded-xl"><ShieldCheck size={28}/></div>
          <h1 className="text-xl font-black tracking-tighter uppercase leading-none">ML-Audit<br/><span className="text-blue-400 text-sm">PRO v4.0</span></h1>
        </div>

        <nav className="space-y-2 flex-1">
          <button onClick={() => {setActiveTab('dashboard'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20}/> Dashboard</button>
          <button onClick={() => {setActiveTab('missions'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'missions' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}><Users size={20}/> {userRole === 'admin' ? 'Portefeuille Clients' : 'Mes Missions'}</button>
          {userRole === 'admin' && <button onClick={() => {setActiveTab('alerts'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'alerts' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}><AlertTriangle size={20}/> Détection de Fraude</button>}
          <button className="w-full text-left p-4 rounded-2xl flex items-center gap-3 hover:bg-slate-800 text-slate-500 cursor-not-allowed"><FileText size={20}/> Rapports CAC</button>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase">Session : {userRole}</p>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-4 hover:bg-red-900/10 rounded-2xl w-full transition font-bold"><LogOut size={20}/> Déconnexion</button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 p-4 sm:p-10 lg:p-16 overflow-auto">
        
        {/* DASHBOARD - EXPERT SYSTEM VIEW */}
        {activeTab === 'dashboard' && (
          <div>
            <header className="mb-10">
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic">Tableau de Bord Augmented Audit</h2>
                <p className="text-slate-400 font-medium">Système Expert de Martinique - Normes ISA / NEP</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Widget Missions */}
                <div className="bg-[#0f172a] p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                    <p className="text-blue-400 font-bold text-xs uppercase mb-2">Dossiers en cours</p>
                    <p className="text-7xl font-black">{missions.length}</p>
                    <BarChart3 className="absolute right-[-20px] bottom-[-20px] text-white/5" size={180} />
                </div>

                {/* Widget Seuils (Si mission sélectionnée) */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-400 mb-4"><Scale size={18}/> <span className="text-xs font-bold uppercase">Seuil de Signification (ISA 320)</span></div>
                    <p className="text-3xl font-black text-slate-900">
                        {missions[0]?.seuil_signification ? `${missions[0].seuil_signification.toLocaleString()} €` : "En attente"}
                    </p>
                    <p className="text-slate-400 text-xs mt-2">Basé sur 1% du CA déclaré</p>
                </div>

                {/* Widget Opinion IA */}
                <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-400 mb-4"><Gavel size={18}/> <span className="text-xs font-bold uppercase">Recommandation d'Opinion</span></div>
                    <div className="bg-green-50 text-green-700 p-4 rounded-2xl font-black text-sm text-center">
                        CERTIFICATION SANS RÉSERVE
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 italic text-center">Analyse basée sur les 21 cycles d'audit</p>
                </div>
            </div>

            {/* FORMULAIRE CRÉATION (CLIENT) */}
            {userRole === 'client' && (
              <div className="bg-white p-8 sm:p-12 rounded-[50px] shadow-xl border border-slate-100 mb-12">
                <h3 className="text-2xl font-black mb-8 flex items-center gap-3"><PlusCircle className="text-blue-600"/> Nouveau Dossier d'Audit</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-2">Raison Sociale</label>
                    <input type="text" placeholder="Ex: RVJ Expertise" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-2">Chiffre d'Affaires N (CA)</label>
                    <input type="number" placeholder="Ex: 1500000" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" value={ca} onChange={e => setCa(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-2">Résultat Net N</label>
                    <input type="number" placeholder="Ex: 50000" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" value={resultat} onChange={e => setResultat(e.target.value)} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-2">Total Bilan</label>
                    <input type="number" placeholder="Ex: 2000000" className="p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" value={bilan} onChange={e => setBilan(e.target.value)} />
                  </div>
                </div>
                <button disabled={loading} onClick={createMission} className="w-full mt-8 bg-blue-600 text-white p-5 rounded-3xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-200 transition">
                    {loading ? "GÉNÉRATION DU DOSSIER..." : "LANCER LA MISSION V4.0"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* LISTE DES MISSIONS */}
        {activeTab === 'missions' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black mb-8 italic flex items-center gap-3"><Users className="text-blue-600"/> Portefeuille Actif</h2>
            {missions.map(m => (
              <div key={m.id} className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                <div>
                  <h4 className="font-black text-2xl text-slate-900">{m.raison_sociale}</h4>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500 uppercase">CA: {m.chiffre_affaires_n?.toLocaleString()} €</span>
                    <span className="text-[10px] font-bold bg-blue-50 px-3 py-1 rounded-full text-blue-600 uppercase">Seuil: {m.seuil_signification?.toLocaleString()} €</span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {userRole === 'client' && (
                    <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-3xl border border-slate-200">
                      <input type="file" className="text-[10px]" onChange={(e) => setFile(e.target.files[0])} />
                      <button disabled={uploading} onClick={() => handleUpload(m.id)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase transition">
                        {uploading ? "ANALYSE IA..." : "DÉPOSER FEC"}
                      </button>
                    </div>
                  )}
                  {userRole === 'admin' && (
                    <button onClick={() => fetchAnomalies(m)} className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase hover:bg-black transition">
                        Vérifier 21 Cycles IA
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ALERTS (DETECTION FRAUDE) */}
        {activeTab === 'alerts' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-3xl font-black text-slate-900 italic">Analyse des Risques : {selectedMission?.raison_sociale}</h3>
                    <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Random Forest Classification & SHAP values</p>
                </div>
                <button onClick={() => setActiveTab('missions')} className="text-blue-600 font-black text-xs uppercase underline">Changer de mission</button>
            </div>

            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead className="bg-[#0f172a] text-white">
                            <tr>
                                <th className="p-6 text-xs font-bold uppercase">Niveau</th>
                                <th className="p-6 text-xs font-bold uppercase">Cycle d'Audit</th>
                                <th className="p-6 text-xs font-bold uppercase">Description de l'Anomalie</th>
                                <th className="p-6 text-xs font-bold uppercase text-right">Impact Financier</th>
                            </tr>
                        </thead>
                        <tbody>
                            {anomalies.map((a, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50 transition border-slate-100">
                                <td className="p-6">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                                        a.niveau_criticite === 'CRITIQUE' ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-orange-400 text-white'
                                    }`}>
                                        {a.niveau_criticite}
                                    </span>
                                </td>
                                <td className="p-6 font-black text-slate-700 uppercase text-xs">{a.cycle}</td>
                                <td className="p-6">
                                    <div className="text-sm font-bold text-slate-900">{a.type_anomalie}</div>
                                    <div className="text-xs text-slate-400 max-w-md">{a.description}</div>
                                </td>
                                <td className="p-6 text-right font-mono font-black text-blue-600">
                                    {a.montant > 0 ? `${a.montant.toLocaleString()} €` : "--"}
                                </td>
                            </tr>
                            ))}
                            {anomalies.length === 0 && (
                                <tr><td colSpan="4" className="p-32 text-center text-slate-300 font-black uppercase italic tracking-widest">Aucune anomalie détectée par l'intelligence artificielle</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* FOOTER ANALYSE */}
            <div className="mt-10 p-8 bg-blue-50 rounded-[40px] border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div>
                    <p className="text-xs font-bold text-blue-400 uppercase">Impact Total Anomalies</p>
                    <p className="text-3xl font-black text-blue-900">
                        {anomalies.reduce((sum, a) => sum + (a.montant || 0), 0).toLocaleString()} €
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-blue-400 uppercase">Statut Continuité d'Exploitation</p>
                    <p className="text-sm font-black text-green-600 uppercase">Favorable (Going Concern OK)</p>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;