import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { LayoutDashboard, FileText, AlertTriangle, Upload, BarChart3, Users, LogOut, PlusCircle, ShieldCheck, RefreshCw } from 'lucide-react';

// TON LIEN RENDER
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

  // --- CONFIGURATION ADMIN ---
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

  // --- RÉCUPÉRATION DATA ---
  const fetchMissions = async () => {
    const { data } = await supabase.from('missions').select('*');
    setMissions(data || []);
  };

  const fetchAnomalies = async (missionId) => {
    try {
      const res = await axios.get(`${API_URL}/anomalies/${missionId}`);
      setAnomalies(res.data);
      setActiveTab('alerts');
    } catch (e) {
      alert("Erreur lors de la récupération des alertes.");
    }
  };

  const handleAuth = async (type) => {
    if (!email || !password) return alert("Remplissez les champs");
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const createMission = async () => {
    if (!raisonSociale) return alert("Nom de société requis");
    const { error } = await supabase.from('missions').insert([{ raison_sociale: raisonSociale, exercice_n: 2024, statut: 'Initialisée' }]);
    if (error) alert(error.message);
    else { alert("Mission créée !"); setRaisonSociale(''); fetchMissions(); }
  };

  // --- FONCTION UPLOAD (RELIÉE À RENDER) ---
  const handleUpload = async (missionId) => {
    if (!file) return alert("Veuillez choisir un fichier FEC");
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/analyze/${missionId}`, formData);
      alert("Analyse IA terminée : " + res.data.message);
      fetchMissions();
      setUploading(false);
    } catch (e) {
      alert("Erreur lors de l'analyse sur le serveur.");
      setUploading(false);
    }
  };

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f172a] text-white p-6">
        <div className="max-w-md w-full bg-[#1e293b] p-10 rounded-[40px] shadow-2xl border border-slate-700">
          <div className="text-center mb-10">
            <ShieldCheck size={60} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-black">ML-AUDIT PRO</h1>
            <p className="text-slate-400 text-sm italic">Audit Augmenté par IA</p>
          </div>
          <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-2xl bg-slate-700 outline-none" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-8 rounded-2xl bg-slate-700 outline-none" onChange={e => setPassword(e.target.value)} />
          <button onClick={() => handleAuth('login')} className="w-full bg-blue-600 p-4 rounded-2xl font-bold mb-4">Connexion</button>
          <button onClick={() => handleAuth('signup')} className="w-full text-slate-400 text-sm hover:underline">Créer un compte Client</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      <div className="w-72 bg-[#0f172a] text-white p-6 flex flex-col shadow-2xl">
        <h1 className="text-xl font-black mb-12 flex items-center gap-2 text-blue-400 uppercase tracking-tighter"><ShieldCheck /> Audit Pro</h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => setActiveTab('missions')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'missions' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Users size={20} /> {userRole === 'admin' ? 'Clients' : 'Mes Missions'}</button>
          {userRole === 'admin' && <button onClick={() => setActiveTab('alerts')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'alerts' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><AlertTriangle size={20} /> Alertes IA</button>}
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-4 hover:bg-red-900/10 rounded-2xl transition mt-auto"><LogOut size={20} /> Déconnexion</button>
      </div>

      <div className="flex-1 p-12 overflow-auto text-slate-900">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-4xl font-black mb-10 tracking-tight">Vue d'ensemble</h2>
            {userRole === 'client' && (
              <div className="bg-white p-10 rounded-[40px] shadow-sm border mb-10">
                <h3 className="text-xl font-bold mb-4">Enregistrer une nouvelle société</h3>
                <div className="flex gap-4">
                  <input type="text" placeholder="Nom de l'entreprise" className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
                  <button onClick={createMission} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-bold">Créer</button>
                </div>
              </div>
            )}
            <div className="bg-[#0f172a] p-10 rounded-[40px] text-white shadow-xl">
               <p className="text-slate-400 font-bold uppercase text-xs mb-2">Dossiers Actifs</p>
               <p className="text-7xl font-black text-blue-400">{missions.length}</p>
            </div>
          </div>
        )}

        {activeTab === 'missions' && (
          <div className="space-y-4">
            <h2 className="text-3xl font-black mb-8 italic">Missions en cours</h2>
            {missions.map(m => (
              <div key={m.id} className="bg-white p-8 rounded-[35px] shadow-sm border flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-xl">{m.raison_sociale}</h4>
                  <p className="text-slate-400 text-sm">Status : <span className="text-blue-600 font-bold">{m.statut}</span></p>
                </div>
                <div className="flex gap-3">
                  {userRole === 'client' && m.statut === 'Initialisée' && (
                    <div className="flex items-center gap-2">
                      <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files[0])} />
                      <button onClick={() => handleUpload(m.id)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm">{uploading ? "Analyse..." : "Uploader FEC"}</button>
                    </div>
                  )}
                  {userRole === 'admin' && (
                    <button onClick={() => fetchAnomalies(m.id)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm">Vérifier Fraudes IA</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border">
            <table className="w-full text-left">
              <thead className="bg-slate-900 text-white">
                <tr><th className="p-6">Criticité</th><th className="p-6">Cycle</th><th className="p-6">Description</th><th className="p-6 text-right">Montant</th></tr>
              </thead>
              <tbody>
                {anomalies.map((a, i) => (
                  <tr key={i} className="border-b hover:bg-slate-50">
                    <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[10px] font-black ${a.niveau_criticite === 'CRITIQUE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{a.niveau_criticite}</span></td>
                    <td className="p-6 font-bold">{a.cycle}</td>
                    <td className="p-6 text-slate-500 text-sm">{a.description}</td>
                    <td className="p-6 text-right font-black text-blue-600">{a.montant > 0 ? `${a.montant} €` : "--"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;