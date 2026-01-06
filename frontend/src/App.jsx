import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { LayoutDashboard, FileText, AlertTriangle, Upload, BarChart3, Users, LogOut, PlusCircle, ShieldCheck } from 'lucide-react';

function App() {
  // --- ÉTATS (STATES) ---
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [raisonSociale, setRaisonSociale] = useState('');
  const [missions, setMissions] = useState([]);
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState('client');
  const [activeTab, setActiveTab] = useState('dashboard');

  // --- CONFIGURATION ---
  // Ajoute ton email ici pour devenir Admin automatiquement
  const ADMIN_EMAILS = ['contact@rvj-audit.com', 'marilyneaniambossou@gmail.com'];

  // --- 1. GESTION DE LA SESSION & RÔLES ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) checkRole(session.user);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) checkRole(session.user);
    });
  }, []);

  const checkRole = (user) => {
    if (ADMIN_EMAILS.includes(user.email)) {
      setUserRole('admin');
    } else {
      setUserRole('client');
    }
  };

  useEffect(() => {
    if (session) fetchMissions();
  }, [session, userRole]);

  // --- 2. AUTHENTIFICATION ---
  const handleAuth = async (type) => {
    if (!email || !password) return alert("Remplissez les champs");
    setLoading(true);
    
    if (type === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert("Erreur: " + error.message);
      else alert("Inscription réussie ! Vérifiez vos emails ou connectez-vous si la confirmation est désactivée.");
      setLoading(false);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Erreur: " + error.message);
      setLoading(false);
    }
  };

  // --- 3. ACTIONS DATA ---
  const createMission = async () => {
    if (!raisonSociale) return alert("Nom de société requis");
    const { error } = await supabase.from('missions').insert([
      { raison_sociale: raisonSociale, exercice_n: 2024, statut: 'Initialisée' }
    ]);
    if (error) alert(error.message);
    else {
      alert("Mission créée avec succès !");
      setRaisonSociale('');
      fetchMissions();
    }
  };

  const fetchMissions = async () => {
    const { data } = await supabase.from('missions').select('*');
    setMissions(data || []);
  };

  // --- ÉCRAN DE CONNEXION ---
  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900 text-white p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 p-10 rounded-[30px] shadow-2xl border border-slate-700">
          <div className="text-center mb-8">
            <BarChart3 size={50} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-black italic">ML-AUDIT PRO</h1>
            <p className="text-slate-400 text-sm mt-2">Cabinet RVJ Audit & Expertise</p>
          </div>
          <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-2xl bg-slate-700 border-none outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-6 rounded-2xl bg-slate-700 border-none outline-none focus:ring-2 focus:ring-blue-500" onChange={e => setPassword(e.target.value)} />
          <div className="flex gap-4">
            <button disabled={loading} onClick={() => handleAuth('login')} className="flex-1 bg-blue-600 p-4 rounded-2xl font-bold hover:bg-blue-700 transition">Connexion</button>
            <button disabled={loading} onClick={() => handleAuth('signup')} className="flex-1 bg-slate-600 p-4 rounded-2xl font-bold hover:bg-slate-500 transition">S'inscrire</button>
          </div>
        </div>
      </div>
    );
  }

  // --- INTERFACE PRINCIPALE ---
  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      
      {/* SIDEBAR AJUSTÉE SELON LE RÔLE */}
      <div className="w-72 bg-slate-900 text-white p-6 flex flex-col shadow-2xl">
        <div className="flex items-center gap-3 mb-12 px-2">
          <ShieldCheck size={32} className="text-blue-400" />
          <h1 className="text-xl font-black tracking-tight">ML-AUDIT PRO</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          {/* Menu commun */}
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'dashboard' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={20} /> Dashboard
          </button>

          {/* Menu spécifique ADMIN */}
          {userRole === 'admin' ? (
            <>
              <button onClick={() => setActiveTab('missions')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'missions' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
                <Users size={20} /> Portefeuille Clients
              </button>
              <button onClick={() => setActiveTab('alerts')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'alerts' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
                <AlertTriangle size={20} /> Alertes de Fraude
              </button>
            </>
          ) : (
            /* Menu spécifique CLIENT */
            <>
              <button onClick={() => setActiveTab('missions')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'missions' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
                <FileText size={20} /> Ma Mission
              </button>
              <button onClick={() => setActiveTab('upload')} className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition ${activeTab === 'upload' ? 'bg-blue-600 shadow-lg' : 'hover:bg-slate-800'}`}>
                <Upload size={20} /> Déposer mon FEC
              </button>
            </>
          )}
        </nav>

        {/* Info Rôle & Déconnexion */}
        <div className="mt-auto pt-6 border-t border-slate-800">
          <div className="px-4 py-3 mb-4 bg-slate-800 rounded-2xl">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Profil Actuel</p>
            <p className="text-sm font-bold text-blue-400 capitalize">{userRole}</p>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 w-full p-4 hover:bg-red-900/20 rounded-2xl transition">
            <LogOut size={20} /> Déconnexion
          </button>
        </div>
      </div>

      {/* CONTENU DYNAMIQUE */}
      <div className="flex-1 p-12 overflow-auto">
        <header className="mb-10 flex justify-between items-start">
          <div>
            <h2 className="text-4xl font-black text-slate-900 capitalize">{activeTab}</h2>
            <p className="text-slate-500 font-medium">Connecté en tant que : {session.user.email}</p>
          </div>
        </header>

        {/* VUE DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {userRole === 'client' && (
              <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
                <PlusCircle size={40} className="text-blue-600 mb-6" />
                <h3 className="text-2xl font-bold mb-2">Nouvelle Mission</h3>
                <p className="text-slate-400 mb-8">Enregistrez votre société pour l'exercice 2024.</p>
                <input type="text" placeholder="Nom de l'entreprise" className="w-full p-4 bg-slate-50 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-blue-500" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} />
                <button onClick={createMission} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Créer le dossier d'audit</button>
              </div>
            )}
            <div className="bg-slate-900 p-10 rounded-[40px] text-white flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Statistiques</h3>
                <p className="text-slate-400">{userRole === 'admin' ? 'Dossiers gérés' : 'Missions en cours'}</p>
              </div>
              <div className="text-7xl font-black text-blue-400 mt-6">{missions.length}</div>
            </div>
          </div>
        )}

        {/* VUE MISSIONS */}
        {activeTab === 'missions' && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <h3 className="text-2xl font-bold mb-6">{userRole === 'admin' ? 'Portefeuille Clients' : 'Mes Dossiers'}</h3>
            <div className="space-y-4">
              {missions.map((m) => (
                <div key={m.id} className="p-6 border border-slate-50 rounded-3xl flex justify-between items-center hover:bg-slate-50 transition">
                  <div>
                    <h4 className="font-bold text-lg">{m.raison_sociale}</h4>
                    <p className="text-slate-400 text-sm italic">Status: {m.statut}</p>
                  </div>
                  <button className="bg-slate-900 text-white px-6 py-2 rounded-xl text-sm font-bold">Consulter</button>
                </div>
              ))}
              {missions.length === 0 && <p className="text-slate-400 text-center py-10">Aucun dossier trouvé.</p>}
            </div>
          </div>
        )}

        {/* VUE UPLOAD (CLIENT) */}
        {activeTab === 'upload' && (
          <div className="bg-white p-12 rounded-[40px] shadow-sm border border-slate-100 text-center max-w-2xl mx-auto">
            <Upload size={50} className="mx-auto text-blue-600 mb-6" />
            <h3 className="text-2xl font-bold mb-4">Dépôt du fichier FEC</h3>
            <p className="text-slate-400 mb-8">Format accepté : .txt ou .csv (standard DGI)</p>
            <div className="border-2 border-dashed border-slate-200 p-10 rounded-3xl mb-8">
               <input type="file" className="text-sm" />
            </div>
            <button className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 transition">Lancer l'analyse IA</button>
          </div>
        )}

        {/* VUE ALERTE (ADMIN) */}
        {activeTab === 'alerts' && (
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
            <h3 className="text-2xl font-bold mb-2">Détection d'Anomalies</h3>
            <p className="text-slate-400 mb-8">Résultats basés sur le moteur Random Forest.</p>
            <div className="flex items-center justify-center p-20 border border-slate-100 rounded-3xl text-slate-300 italic">
               Sélectionnez un client pour voir les fraudes potentielles.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;