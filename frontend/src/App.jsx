import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { 
  LayoutDashboard, FileText, AlertTriangle, Upload, BarChart3, 
  Users, LogOut, PlusCircle, ShieldCheck, Menu, X, Gavel, Scale, Fingerprint, User, Briefcase 
} from 'lucide-react';

const API_URL = "https://ml-audit-pro.onrender.com";

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState('client');
  const [isAdminLoginForm, setIsAdminLoginForm] = useState(false);
  const [missions, setMissions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [file, setFile] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- CORRECTION : État d'upload par ID ---
  const [uploadingId, setUploadingId] = useState(null); 

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
    try {
      const res = await axios.get(`${API_URL}/missions`);
      setMissions(res.data || []);
    } catch (e) { console.error("Erreur Backend", e); }
  };

  const handleUpload = async (missionId) => {
    if (!file) return alert("Veuillez d'abord choisir un fichier !");
    
    // On active seulement LE bouton cliqué
    setUploadingId(missionId); 
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/analyze/${missionId}`, formData);
      alert("Succès : " + res.data.message);
      fetchMissions();
    } catch (e) {
      // On affiche l'erreur réelle pour comprendre pourquoi ça bloque
      const errorMsg = e.response?.data?.detail || e.message;
      alert("Erreur Serveur : " + errorMsg);
    } finally {
      setUploadingId(null); // On libère le bouton
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

  // --- RENDU UI (LOGIN) ---
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white">
        <div className="max-w-md w-full bg-[#1e293b] p-8 rounded-[40px] shadow-2xl border border-slate-700">
          <ShieldCheck size={50} className="mx-auto text-blue-400 mb-6" />
          <div className="flex bg-slate-800 p-1 rounded-2xl mb-8">
            <button onClick={() => setIsAdminLoginForm(false)} className={`flex-1 py-3 rounded-xl font-bold transition ${!isAdminLoginForm ? 'bg-blue-600' : 'text-slate-400'}`}>Client</button>
            <button onClick={() => setIsAdminLoginForm(true)} className={`flex-1 py-3 rounded-xl font-bold transition ${isAdminLoginForm ? 'bg-slate-700' : 'text-slate-400'}`}>Auditeur</button>
          </div>
          <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-2xl bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-8 rounded-2xl bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setPassword(e.target.value)} />
          <button disabled={loading} onClick={() => handleAuth('login')} className="w-full bg-blue-600 p-4 rounded-2xl font-black">{loading ? "CONNEXION..." : "SE CONNECTER"}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 text-slate-900">
      {/* SIDEBAR */}
      <div className="w-full lg:w-80 bg-[#0f172a] text-white p-6 flex flex-col shadow-2xl">
        <h1 className="text-xl font-black mb-12 flex items-center gap-2 text-blue-400 uppercase tracking-tighter"><ShieldCheck /> Audit Pro 4.0</h1>
        <nav className="space-y-2 flex-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => setActiveTab('missions')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 ${activeTab === 'missions' ? 'bg-blue-600' : 'hover:bg-slate-800'}`}><Users size={20} /> {userRole === 'admin' ? 'Clients' : 'Mes Missions'}</button>
        </nav>
        <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-4 hover:bg-red-900/10 rounded-2xl mt-auto"><LogOut size={20} /> Déconnexion</button>
      </div>

      {/* CONTENU */}
      <div className="flex-1 p-6 lg:p-12 overflow-auto">
        {activeTab === 'dashboard' && <h2 className="text-4xl font-black mb-10">Bienvenue, {userRole}</h2>}

        {activeTab === 'missions' && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black italic mb-8">Portefeuille Actif</h2>
            {missions.map(m => (
              <div key={m.id} className="bg-white p-6 sm:p-10 rounded-[40px] shadow-sm border flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                  <h4 className="font-black text-2xl text-slate-900">{m.raison_sociale}</h4>
                  <span className="bg-blue-50 text-blue-600 px-4 py-1 rounded-full text-xs font-black uppercase">{m.statut}</span>
                </div>
                
                {userRole === 'client' && (
                  <div className="flex flex-col gap-3 bg-slate-50 p-4 rounded-3xl">
                    <input type="file" className="text-xs" onChange={(e) => setFile(e.target.files[0])} />
                    <button 
                      disabled={uploadingId === m.id} 
                      onClick={() => handleUpload(m.id)} 
                      className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm disabled:bg-slate-400"
                    >
                      {uploadingId === m.id ? "ANALYSE EN COURS..." : "UPLOADER LE FEC"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;