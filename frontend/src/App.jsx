import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { LayoutDashboard, FileText, AlertTriangle, Upload, BarChart3, Users, LogOut, PlusCircle, ShieldCheck, Menu, X } from 'lucide-react';

const API_URL = "https://ml-audit-pro.onrender.com";

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('client');
  const [raisonSociale, setRaisonSociale] = useState('');
  const [missions, setMissions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Pour le menu mobile

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
    const { data } = await supabase.from('missions').select('*');
    setMissions(data || []);
  };

  const fetchAnomalies = async (missionId) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/anomalies/${missionId}`);
      setAnomalies(res.data);
      setActiveTab('alerts');
    } catch (e) {
      alert("Erreur lors de la récupération des alertes.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (type) => {
    if (!email || !password) return alert("Remplissez les champs");
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
        alert(error.message);
        setLoading(false);
    }
    // En cas de succès, useEffect gère la session et met loading à false
  };

  const createMission = async () => {
    if (!raisonSociale) return alert("Nom de société requis");
    setLoading(true);
    const { error } = await supabase.from('missions').insert([{ raison_sociale: raisonSociale, exercice_n: 2024, statut: 'Initialisée' }]);
    if (error) alert(error.message);
    else { 
        alert("Mission créée !"); 
        setRaisonSociale(''); 
        fetchMissions(); 
    }
    setLoading(false);
  };

  const handleUpload = async (missionId) => {
    if (!file) return alert("Veuillez choisir un fichier FEC");
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/analyze/${missionId}`, formData);
      alert("Analyse IA terminée : " + res.data.message);
      fetchMissions();
    } catch (e) {
      alert("Erreur lors de l'analyse.");
    } finally {
      setUploading(false);
    }
  };

  // --- ECRAN DE CONNEXION RESPONSIVE ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 sm:p-6">
        <div className="max-w-md w-full bg-[#1e293b] p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] shadow-2xl border border-slate-700">
          <div className="text-center mb-8">
            <ShieldCheck size={50} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-2xl sm:text-3xl font-black text-white">ML-AUDIT PRO</h1>
            <p className="text-slate-400 text-sm italic">Audit Augmenté par IA</p>
          </div>
          <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-6 rounded-2xl bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setPassword(e.target.value)} />
          
          <button 
            disabled={loading} 
            onClick={() => handleAuth('login')} 
            className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold mb-4 hover:bg-blue-700 transition disabled:bg-slate-500"
          >
            {loading ? "Traitement en cours..." : "Connexion"}
          </button>
          
          <button 
            disabled={loading}
            onClick={() => handleAuth('signup')} 
            className="w-full text-slate-400 text-sm hover:underline disabled:opacity-50"
          >
            {loading ? "" : "Créer un compte Client"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans">
      
      {/* BOUTON MENU MOBILE */}
      <div className="lg:hidden bg-[#0f172a] text-white p-4 flex justify-between items-center shadow-lg">
        <h1 className="font-black flex items-center gap-2"><ShieldCheck className="text-blue-400"/> AUDIT PRO</h1>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* SIDEBAR RESPONSIVE */}
      <div className={`${isMenuOpen ? 'block' : 'hidden'} lg:flex w-full lg:w-72 bg-[#0f172a] text-white p-6 flex-col shadow-2xl`}>
        <h1 className="hidden lg:flex text-xl font-black mb-12 items-center gap-2 text-blue-400 uppercase tracking-tighter"><ShieldCheck /> Audit Pro</h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => {setActiveTab('dashboard'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => {setActiveTab('missions'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'missions' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Users size={20} /> {userRole === 'admin' ? 'Clients' : 'Mes Missions'}</button>
          {userRole === 'admin' && <button onClick={() => {setActiveTab('alerts'); setIsMenuOpen(false);}} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'alerts' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><AlertTriangle size={20} /> Alertes IA</button>}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-4 hover:bg-red-900/10 rounded-2xl transition mt-auto"><LogOut size={20} /> Déconnexion</button>
      </div>

      {/* CONTENU RESPONSIVE */}
      <div className="flex-1 p-4 sm:p-8 lg:p-12 overflow-auto text-slate-900">
        <header className="mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight capitalize">{activeTab}</h2>
          <p className="text-slate-500 text-sm sm:text-base font-medium">Rôle : <span className="text-blue-600 font-bold uppercase">{userRole}</span></p>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-6 sm:gap-8">
            {userRole === 'client' && (
              <div className="bg-white p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] shadow-sm border">
                <h3 className="text-lg sm:text-xl font-bold mb-4">Nouvelle société</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input type="text" placeholder="Nom de l'entreprise" className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none border focus:border-blue-500" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
                  <button 
                    disabled={loading}
                    onClick={createMission} 
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-blue-700 transition disabled:bg-slate-400"
                  >
                    {loading ? "Création..." : "Créer"}
                  </button>
                </div>
              </div>
            )}
            <div className="bg-[#0f172a] p-6 sm:p-10 rounded-[30px] sm:rounded-[40px] text-white shadow-xl">
               <p className="text-slate-400 font-bold uppercase text-[10px] sm:text-xs mb-2">Dossiers Actifs</p>
               <p className="text-5xl sm:text-7xl font-black text-blue-400">{missions.length}</p>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-black mb-6 italic">Missions en cours</h2>
            {missions.map(m => (
              <div key={m.id} className="bg-white p-4 sm:p-8 rounded-[25px] sm:rounded-[35px] shadow-sm border flex flex-col sm:row justify-between sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-lg sm:text-xl">{m.raison_sociale}</h4>
                  <p className="text-slate-400 text-xs sm:text-sm">Status : <span className="text-blue-600 font-bold">{m.statut}</span></p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  {userRole === 'client' && (
                    <div className="flex flex-col gap-2">
                      <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files[0])} />
                      <button 
                        disabled={uploading}
                        onClick={() => handleUpload(m.id)} 
                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm disabled:bg-slate-400"
                      >
                        {uploading ? "Traitement IA..." : "Uploader FEC"}
                      </button>
                    </div>
                  )}
                  {userRole === 'admin' && (
                    <button 
                        disabled={loading}
                        onClick={() => fetchAnomalies(m.id)} 
                        className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm disabled:opacity-50"
                    >
                        {loading ? "Chargement..." : "Vérifier Fraudes"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-[25px] sm:rounded-[40px] shadow-xl overflow-hidden border">
            <div className="overflow-x-auto"> {/* Permet de scroller le tableau sur mobile */}
                <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-900 text-white">
                    <tr><th className="p-4 sm:p-6">Criticité</th><th className="p-4 sm:p-6">Cycle</th><th className="p-4 sm:p-6">Description</th><th className="p-4 sm:p-6 text-right">Montant</th></tr>
                </thead>
                <tbody>
                    {anomalies.map((a, i) => (
                    <tr key={i} className="border-b hover:bg-slate-50 transition">
                        <td className="p-4 sm:p-6"><span className={`px-2 py-1 rounded-lg text-[10px] font-black ${a.niveau_criticite === 'CRITIQUE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{a.niveau_criticite}</span></td>
                        <td className="p-4 sm:p-6 font-bold text-sm sm:text-base">{a.cycle}</td>
                        <td className="p-4 sm:p-6 text-slate-500 text-xs sm:text-sm">{a.description}</td>
                        <td className="p-4 sm:p-6 text-right font-black text-blue-600 text-sm sm:text-base">{a.montant > 0 ? `${a.montant} €` : "--"}</td>
                    </tr>
                    ))}
                    {anomalies.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-slate-400">Aucune donnée.</td></tr>}
                </tbody>
                </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;