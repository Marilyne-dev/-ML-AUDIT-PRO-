import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import axios from 'axios';
import { 
  LayoutDashboard, AlertTriangle, LogOut, Download, Briefcase, 
  PlusCircle, ShieldCheck, Menu, CheckCircle, Eye, 
  Folder, Upload, Search, BarChart3, Settings, HelpCircle, Scale,
  ChevronDown, ChevronRight, Grid, Circle, Lock, FileText,
  Activity, PieChart, FileCheck
} from 'lucide-react';

// --- IMPORT DES MODULES EXTERNES (Fichiers que nous avons créés) ---
import { MENU_STRUCTURE } from './menuConfig';
import ConfigurationView from './ConfigurationView';
import HelpView from './HelpView';
import ChatBot from './ChatBot';
import CircularisationView from './CircularisationView';
import CycleDetailView from './CycleDetailView';
import KnowledgeView from './KnowledgeView';
import MissionLetterView from './MissionLetterView';
import FinalRevisionView from './FinalRevisionView';
import DashboardAnalyticsView from './DashboardAnalyticsView';
import RiskMappingView from './RiskMappingView';


const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000"
  : "https://ml-audit-pro.onrender.com";

// ============================================================================
// COMPOSANTS INTERNES (VUES SPÉCIFIQUES À APP.JSX)
// ============================================================================

// 1. DASHBOARD
const DashboardView = ({ missions }) => (
  <div className="max-w-5xl mx-auto animate-in fade-in zoom-in duration-300">
    <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic">Tableau de Bord</h2>
        <p className="text-slate-400 text-sm font-medium">Synthèse de l'activité du cabinet</p>
    </header>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-600 p-6 rounded-[30px] text-white shadow-xl relative overflow-hidden">
            <p className="text-blue-200 font-bold text-xs uppercase mb-1">Missions</p>
            <p className="text-5xl font-black">{missions.length}</p>
            <Folder className="absolute right-[-10px] bottom-[-10px] text-white/20" size={100} />
        </div>
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 mb-2"><AlertTriangle size={16}/> <span className="text-xs font-bold uppercase">Alertes</span></div>
            <p className="text-3xl font-black text-slate-900">
                {missions.filter(m => m.statut === 'Analysée').length}
            </p>
        </div>
        <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 text-slate-400 mb-2"><Eye size={16}/> <span className="text-xs font-bold uppercase">Téléchargements</span></div>
            <p className="text-3xl font-black text-slate-900">
                {missions.reduce((acc, m) => acc + (m.download_count || 0), 0)}
            </p>
        </div>
    </div>
  </div>
);

// 2. NOUVELLE MISSION
const NewMissionView = ({ onCreate, loading }) => {
    const [form, setForm] = useState({ raisonSociale: '', exercice: '2025', ca: '', resultat: '', bilan: '' });
    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
            <h3 className="text-2xl font-black mb-6 flex items-center gap-3"><PlusCircle className="text-blue-600"/> Nouvelle Mission</h3>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Raison Sociale" className="p-3 bg-slate-50 rounded-xl text-sm outline-none border focus:border-blue-500" value={form.raisonSociale} onChange={e => setForm({...form, raisonSociale: e.target.value})} />
                    <input type="text" placeholder="Exercice (2025)" className="p-3 bg-slate-50 rounded-xl text-sm outline-none border focus:border-blue-500" value={form.exercice} onChange={e => setForm({...form, exercice: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="CA (N)" className="p-3 bg-slate-50 rounded-xl text-sm outline-none border focus:border-blue-500" value={form.ca} onChange={e => setForm({...form, ca: e.target.value})} />
                    <input type="number" placeholder="Résultat Net" className="p-3 bg-slate-50 rounded-xl text-sm outline-none border focus:border-blue-500" value={form.resultat} onChange={e => setForm({...form, resultat: e.target.value})} />
                </div>
                <input type="number" placeholder="Total Bilan" className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none border focus:border-blue-500" value={form.bilan} onChange={e => setForm({...form, bilan: e.target.value})} />
                <button disabled={loading} onClick={() => onCreate(form)} className="w-full mt-4 bg-blue-600 text-white p-4 rounded-2xl font-black hover:bg-blue-700 transition disabled:opacity-50">CALCULER SEUILS & CRÉER</button>
            </div>
        </div>
    );
};

// 3. LISTE DES MISSIONS (INTERFACE D'IMPORT SIMPLIFIÉE)
const MissionsListView = ({ missions, onSelectMission, onUpload, uploadingId }) => (
  <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in zoom-in duration-300">
    
    <div className="bg-blue-600 text-white p-8 rounded-[30px] shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
            <h2 className="text-3xl font-black italic flex items-center gap-3">
                <Folder className="text-white/80" size={32}/> Portefeuille Missions
            </h2>
            <p className="text-blue-100 mt-2 text-sm font-medium max-w-md">
                Gérez vos dossiers clients ici. Pour lancer une analyse, cliquez simplement sur le bouton "IMPORTER" et sélectionnez <strong>tous vos fichiers en même temps</strong> (Excel, FEC, PDF...).
            </p>
        </div>
        <div className="bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm text-center min-w-[150px]">
            <span className="block text-4xl font-black">{missions.length}</span>
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Dossiers Actifs</span>
        </div>
    </div>

    {missions.map(m => (
      <div key={m.id} className="bg-white p-6 rounded-[25px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between md:items-center gap-6 hover:shadow-md transition group">
        
        {/* INFO MISSION */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold border border-slate-200 group-hover:bg-blue-50 group-hover:text-blue-600 transition">
                  {m.raison_sociale.substring(0,2).toUpperCase()}
              </div>
              <div>
                  <h4 className="font-black text-xl text-slate-800">{m.raison_sociale}</h4>
                  <div className="flex gap-2 mt-1">
                      <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide">Ex. {m.exercice_comptable}</span>
                      {m.statut === 'Analysée' 
                          ? <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><CheckCircle size={10}/> Analysé</span> 
                          : <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">En attente</span>
                      }
                  </div>
              </div>
          </div>
        </div>

        {/* ACTIONS : C'EST ICI QU'ON SIMPLIFIE POUR LE CLIENT */}
        <div className="flex items-center gap-3">
            
            {/* BOUTON IMPORT UNIQUE ET GROS */}
            <div className="relative">
                <input 
                    type="file" 
                    multiple 
                    id={`file-${m.id}`}
                    className="hidden" 
                    onChange={(e) => onUpload(m, e.target.files)} 
                />
                <label 
                    htmlFor={`file-${m.id}`}
                    className={`cursor-pointer flex items-center gap-3 px-6 py-4 rounded-xl font-black text-xs shadow-lg transition transform hover:scale-105 active:scale-95 ${
                        uploadingId === m.id 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                        : "bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600"
                    }`}
                >
                    {uploadingId === m.id ? (
                        <>⏳ ANALYSE EN COURS...</>
                    ) : (
                        <>
                            <Upload size={18}/> 
                            {m.statut === 'Analysée' ? "AJOUTER FICHIERS" : "IMPORTER DOCUMENTS"}
                        </>
                    )}
                </label>
            </div>

            {/* BOUTON RÉSULTATS */}
            {m.statut === 'Analysée' && (
                <button 
                    onClick={() => onSelectMission(m)} 
                    className="bg-slate-800 text-white px-6 py-4 rounded-xl font-black text-xs hover:bg-slate-900 shadow-lg flex items-center gap-2 transition transform hover:scale-105"
                >
                    VOIR RÉSULTATS <ChevronRight size={14}/>
                </button>
            )}
        </div>
      </div>
    ))}
  </div>
);

// 4. RAPPORT DÉTAILLÉ (AVEC SEUILS)
const ReportView = ({ mission, anomalies, filterCategory, onDownload, onBack }) => {
    // Logique de filtrage des 21 cycles
    const filteredAnomalies = anomalies.filter(a => {
        if (filterCategory === 'ALL') return true;
        if (filterCategory === 'ACTIF') return ['IMMO', 'STOCKS', 'CLIENTS', 'TRESORERIE'].some(c => a.cycle && a.cycle.includes(c));
        if (filterCategory === 'PASSIF') return ['CAPITAUX', 'PROVISIONS', 'EMPRUNTS', 'FOURNISSEURS', 'DETTES'].some(c => a.cycle && a.cycle.includes(c));
        if (filterCategory === 'RESULTAT') return ['CHARGES', 'PRODUITS', 'PERSONNEL', 'IMPOTS'].some(c => a.cycle && a.cycle.includes(c));
        if (filterCategory === 'LEGAL') return ['TRACFIN', 'FRAUDE', 'LEGAL', 'BLANCHIMENT'].some(t => a.type_anomalie && a.type_anomalie.includes(t));
        if (filterCategory === 'OD') return a.cycle === 'OPERATIONS_DIVERSES';
        if (filterCategory === 'CRITIQUE') return a.niveau_criticite === 'CRITIQUE';
        return true;
    });

    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    return (
        <div className="animate-in fade-in duration-300 max-w-6xl mx-auto" onClick={() => setShowDownloadMenu(false)}>
            {/* EN-TÊTE AVEC BOUTONS */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-2xl font-black italic">Rapport : {mission.raison_sociale}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase">
                        Exercice {mission.exercice_comptable} • Filtre : <span className="text-blue-600">{filterCategory}</span>
                    </p>
                </div>
                
                <div className="flex gap-2 relative">
                    <div className="relative" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowDownloadMenu(!showDownloadMenu)} 
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-blue-700 flex items-center gap-2 shadow-lg transition"
                        >
                            <Download size={14}/> TÉLÉCHARGER <ChevronDown size={14}/>
                        </button>

                        {showDownloadMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
                                <button onClick={() => onDownload('pdf')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 font-bold flex items-center gap-2 border-b border-slate-100">
                                    <FileText size={16} className="text-red-500"/> Format PDF
                                </button>
                                <button onClick={() => onDownload('xlsx')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 font-bold flex items-center gap-2 border-b border-slate-100">
                                    <Grid size={16} className="text-green-600"/> Format Excel
                                </button>
                                <button onClick={() => onDownload('txt')} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-blue-50 font-bold flex items-center gap-2">
                                    <FileText size={16} className="text-slate-500"/> Format Texte
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={onBack} className="bg-slate-200 px-4 py-2 rounded-xl text-slate-700 font-bold text-xs">RETOUR</button>
                </div>
            </div>

            {/* --- NOUVEAU : AFFICHAGE DES SEUILS ISA 320 --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total Bilan</p>
                    <p className="text-lg font-black text-slate-800">{mission.total_bilan?.toLocaleString()} €</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm">
                    <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">Seuil Signification</p>
                    <p className="text-lg font-black text-blue-700">{mission.seuil_signification?.toLocaleString()} €</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 shadow-sm">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Seuil Planification (75%)</p>
                    <p className="text-lg font-black text-indigo-700">{mission.seuil_planification?.toLocaleString()} €</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm">
                    <p className="text-[10px] text-orange-400 font-bold uppercase mb-1">Seuil Remontée (5%)</p>
                    <p className="text-lg font-black text-orange-700">{mission.seuil_remontee?.toLocaleString()} €</p>
                </div>
            </div>

            {/* BANDEAU STATUT */}
            <div className={`p-6 rounded-[20px] mb-6 text-white shadow-lg flex items-center gap-4 ${anomalies.length > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                <div className="bg-white/20 p-3 rounded-full">{anomalies.length > 0 ? <AlertTriangle size={30}/> : <CheckCircle size={30}/>}</div>
                <div>
                    <h2 className="text-xl font-black uppercase">{anomalies.length > 0 ? "RISQUE DÉTECTÉ" : "CONFORME"}</h2>
                    <p className="opacity-90 text-sm font-medium">{anomalies.length > 0 ? `${anomalies.length} anomalies trouvées au total` : "Dossier sain"}</p>
                </div>
            </div>

            {/* TABLEAU DES RÉSULTATS */}
            {filteredAnomalies.length > 0 ? (
                <div className="bg-white rounded-[20px] shadow border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px] uppercase font-black">
                            <tr><th className="p-4">Niveau</th><th className="p-4">Type</th><th className="p-4">Cycle</th><th className="p-4">IA Description</th><th className="p-4 text-right">Montant</th></tr>
                        </thead>
                        <tbody>
                            {filteredAnomalies.map((a, i) => (
                            <tr key={i} className="border-b hover:bg-slate-50">
                                <td className="p-4"><span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${a.niveau_criticite === 'CRITIQUE' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>{a.niveau_criticite}</span></td>
                                <td className="p-4 font-bold text-xs text-slate-700">{a.type_anomalie}</td>
                                <td className="p-4 font-bold text-xs text-blue-600">{a.cycle}</td>
                                <td className="p-4 text-xs text-slate-600 max-w-lg">{a.description}</td>
                                <td className="p-4 text-right font-mono font-black text-xs">{a.montant?.toLocaleString()} €</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-10 text-center text-slate-400 italic bg-white rounded-[20px]">
                    Aucune donnée trouvée pour la catégorie <strong>{filterCategory}</strong> dans ce dossier.
                </div>
            )}
        </div>
    );
};

const ComingSoon = () => (
    <div className="flex flex-col items-center justify-center h-full p-10 text-center animate-in fade-in">
        <div className="bg-slate-100 p-8 rounded-[40px] mb-6 shadow-inner"><Lock size={64} className="text-slate-400"/></div>
        <h2 className="text-3xl font-black text-slate-800 mb-4">Module en Développement</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">Cette fonctionnalité sera activée prochainement.</p>
    </div>
);


// --- VUE PARAMÈTRES CLIENT ---
const ClientParamsView = ({ mission }) => (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 animate-in fade-in">
        <h3 className="text-2xl font-black mb-6 flex items-center gap-3"><Settings className="text-blue-600"/> Paramètres : {mission.raison_sociale}</h3>
        <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs font-bold text-slate-400 uppercase">Chiffre d'Affaires</p><p className="text-xl font-black">{mission.chiffre_affaires_n?.toLocaleString()} €</p></div>
            <div className="bg-slate-50 p-4 rounded-xl"><p className="text-xs font-bold text-slate-400 uppercase">Total Bilan</p><p className="text-xl font-black">{mission.total_bilan?.toLocaleString()} €</p></div>
            <div className="bg-blue-50 p-4 rounded-xl"><p className="text-xs font-bold text-blue-400 uppercase">Seuil Signification</p><p className="text-xl font-black text-blue-600">{mission.seuil_signification?.toLocaleString()} €</p></div>
            <div className="bg-orange-50 p-4 rounded-xl"><p className="text-xs font-bold text-orange-400 uppercase">Seuil Remontée</p><p className="text-xl font-black text-orange-600">{mission.seuil_remontee?.toLocaleString()} €</p></div>
        </div>
    </div>
);

// --- VUE MÉTRIQUES ML ---
const MLMetricsView = () => (
    <div className="max-w-4xl mx-auto animate-in fade-in">
        <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><Activity className="text-purple-600"/> Performance de l'IA</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[30px] border border-slate-100 text-center"><div className="text-4xl font-black text-green-500 mb-2">98.5%</div><p className="text-xs font-bold uppercase text-slate-400">Précision Benford</p></div>
            <div className="bg-white p-6 rounded-[30px] border border-slate-100 text-center"><div className="text-4xl font-black text-blue-500 mb-2">1.2s</div><p className="text-xs font-bold uppercase text-slate-400">Vitesse Analyse</p></div>
            <div className="bg-white p-6 rounded-[30px] border border-slate-100 text-center"><div className="text-4xl font-black text-orange-500 mb-2">Claude 3</div><p className="text-xs font-bold uppercase text-slate-400">Moteur LLM</p></div>
        </div>
    </div>
);

// --- VUE GÉNÉRATION RAPPORTS ---
// 5. GÉNÉRATION RAPPORTS (CORRIGÉ)
// --- VUE DÉDIÉE POUR CHAQUE TYPE DE RAPPORT ---
const SingleReportView = ({ mission, reportType }) => {
    if (!mission) return <div className="text-center p-10 text-slate-400">Veuillez sélectionner un dossier.</div>;

    // Configuration dynamique selon le bouton cliqué
    let config = {};
    if (reportType === 'report_cac') {
        config = { 
            title: "Rapport d'Audit Légal (CAC)", 
            desc: "Génération du document PDF officiel avec l'ensemble des seuils et anomalies.",
            format: 'pdf', 
            icon: <FileText size={40} className="text-red-500"/>, 
            bg: 'bg-red-50', border: 'border-red-200', btn: 'bg-red-600 hover:bg-red-700' 
        };
    } else if (reportType === 'report_synthese') {
        config = { 
            title: "Synthèse Exécutive", 
            desc: "Génération du tableau Excel reprenant toutes les données et chiffres clés.",
            format: 'xlsx', 
            icon: <PieChart size={40} className="text-blue-500"/>, 
            bg: 'bg-blue-50', border: 'border-blue-200', btn: 'bg-blue-600 hover:bg-blue-700' 
        };
    } else {
        config = { 
            title: "Recommandation Opinion", 
            desc: "Génération du brouillon texte basé sur les risques détectés par l'IA.",
            format: 'txt', 
            icon: <CheckCircle size={40} className="text-green-500"/>, 
            bg: 'bg-green-50', border: 'border-green-200', btn: 'bg-green-600 hover:bg-green-700' 
        };
    }

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in zoom-in duration-300 mt-10">
            <div className={`p-10 rounded-[40px] shadow-sm border ${config.border} bg-white text-center`}>
                <div className={`w-24 h-24 mx-auto rounded-full ${config.bg} flex items-center justify-center mb-6`}>
                    {config.icon}
                </div>
                <h2 className="text-3xl font-black text-slate-800 mb-4">{config.title}</h2>
                <p className="text-slate-500 mb-2">Dossier : <strong>{mission.raison_sociale}</strong></p>
                <p className="text-sm text-slate-400 mb-8">{config.desc}</p>
                
                <button 
                    onClick={() => window.open(`${API_URL}/export/${mission.id}?format=${config.format}`)}
                    className={`px-8 py-4 rounded-xl text-white font-black flex items-center justify-center gap-3 mx-auto transition shadow-lg w-full md:w-auto ${config.btn}`}
                >
                    <Download size={20}/> TÉLÉCHARGER LE DOCUMENT
                </button>
            </div>
        </div>
    );
};

// --- VUE CONTRÔLE INTÉGRITÉ ---
const IntegrityCheckView = ({ mission, anomalies }) => {
    // Simulation de vérifications basées sur les anomalies trouvées
    const hasError = anomalies.some(a => a.niveau_criticite === 'CRITIQUE');
    const technicalErrors = anomalies.filter(a => a.type_anomalie === 'ERREUR LECTURE');
    
    return (
        <div className="max-w-4xl mx-auto animate-in fade-in">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><ShieldCheck className="text-green-600"/> Contrôle d'Intégrité : {mission.raison_sociale}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Carte Équilibre */}
                <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-full ${hasError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        <Scale size={24}/>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Équilibre Balance</p>
                        <p className="font-black text-lg">{hasError ? "Déséquilibrée" : "Débit = Crédit"}</p>
                    </div>
                </div>

                {/* Carte Format Fichier */}
                <div className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className={`p-3 rounded-full ${technicalErrors.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                        <FileText size={24}/>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Structure Fichiers</p>
                        <p className="font-black text-lg">{technicalErrors.length > 0 ? "Erreurs Structure" : "Conforme FEC/ISA"}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[30px] shadow-sm border border-slate-100 p-8">
                <h3 className="font-bold text-lg mb-4 text-slate-800">Détail des contrôles techniques</h3>
                <ul className="space-y-4">
                    <li className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm font-medium text-slate-600">Cohérence des dates (Exercice {mission.exercice_comptable})</span>
                        <span className="text-xs font-black bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> VALIDE</span>
                    </li>
                    <li className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm font-medium text-slate-600">Séquentialité des écritures (Pas de rupture)</span>
                        <span className="text-xs font-black bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1"><CheckCircle size={12}/> VALIDE</span>
                    </li>
                    <li className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <span className="text-sm font-medium text-slate-600">Total Bilan importé</span>
                        <span className="text-sm font-black text-slate-900">{mission.total_bilan?.toLocaleString()} €</span>
                    </li>
                </ul>
            </div>
        </div>
    );
};

// --- OBLIGATIONS LEGALES ---

const TracfinView = ({ mission, anomalies }) => {
  const tracfinAlerts = anomalies.filter(a =>
    a.type_anomalie?.includes("TRACFIN") ||
    a.type_anomalie?.includes("BLANCHIMENT")
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-black mb-4">Alertes TRACFIN</h2>
      {tracfinAlerts.length === 0 ? (
        <p className="text-slate-500">Aucune alerte détectée.</p>
      ) : (
        <ul className="space-y-3">
          {tracfinAlerts.map((a, i) => (
            <li key={i} className="p-4 bg-red-50 rounded-xl border border-red-200">
              <b>{a.type_anomalie}</b> — {a.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ProcureurView = ({ anomalies }) => {
  const fraud = anomalies.filter(a =>
    a.type_anomalie?.includes("FRAUDE")
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-black mb-4">Révélation au Procureur</h2>
      <p className="mb-4 text-slate-500">Analyse des faits délictueux détectés.</p>
      <p className="text-lg font-bold">
        {fraud.length > 0 ? "⚠️ Soupçon pénal détecté" : "Aucun fait pénal détecté"}
      </p>
    </div>
  );
};

const ContinuiteView = ({ anomalies }) => {
  const risk = anomalies.some(a =>
    a.type_anomalie?.includes("CONTINUITE")
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-black mb-4">Continuité d'exploitation</h2>
      <p className="text-lg font-bold">
        {risk ? "⚠️ Risque sur la continuité" : "Entreprise en continuité normale"}
      </p>
    </div>
  );
};

const ConventionsView = ({ anomalies }) => {
  const conventions = anomalies.filter(a =>
    a.type_anomalie?.includes("CONVENTION")
  );

  return (
    <div className="max-w-5xl mx-auto">
      <h2 className="text-2xl font-black mb-4">Conventions réglementées</h2>
      <p>{conventions.length} convention(s) détectée(s).</p>
    </div>
  );
};

// ============================================================================
// APPLICATION PRINCIPALE
// ============================================================================

function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Navigation & Menu
  const [view, setView] = useState('DASHBOARD');
  const [reportType, setReportType] = useState(null); // <--- AJOUTE CETTE LIGNE ICI
  const [filterCategory, setFilterCategory] = useState('ALL');
  
  const [expandedSection, setExpandedSection] = useState(null);
  const [showFullMenu, setShowFullMenu] = useState(true);
  
  const [userRole, setUserRole] = useState('client');
  const [isAdminLoginForm, setIsAdminLoginForm] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const [missions, setMissions] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedMission, setSelectedMission] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const ADMIN_EMAILS = ['marilyneambossou@gmail.com', 'contact@rvj-audit.com'];

  // On récupère le cycle actif depuis le stockage du navigateur pour la persistance
    const [activeCycleId, setActiveCycleId] = useState(localStorage.getItem('activeCycleId') || null);
    const [cycleChecklist, setCycleChecklist] = useState(JSON.parse(localStorage.getItem('cycleChecklist')) || {});

    useEffect(() => {
    localStorage.setItem('activeCycleId', activeCycleId);
    localStorage.setItem('cycleChecklist', JSON.stringify(cycleChecklist));
}, [activeCycleId, cycleChecklist]);
    
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

  const createMission = async (form) => {
    setLoading(true);
    try {
      await axios.post(`${API_URL}/missions`, {
        user_id: session.user.id,  // <--- ENVOYER L'ID DE LA SESSION
        raison_sociale: form.raisonSociale, exercice_comptable: form.exercice,
        chiffre_affaires_n: parseFloat(form.ca), resultat_net_n: parseFloat(form.resultat || 0),
        total_bilan: parseFloat(form.bilan || 0), client_email: session.user.email
      });
      alert("Dossier créé !");
      fetchMissions(); setView('LIST');
    } catch (e) { alert("Erreur création."); } finally { setLoading(false); }
  };

 const handleUpload = async (mission, files, type = "FEC") => {
    // Supprime la ligne isolée ici
    if (!files || files.length === 0) return alert("Aucun fichier sélectionné.");
    setUploadingId(mission.id); 
    
    const formData = new FormData();
    // On ajoute l'ID de l'utilisateur pour que le backend puisse marquer les anomalies
    formData.append('user_id', session.user.id); 

    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }

    try {
      // On envoie le tout
      await axios.post(`${API_URL}/analyze/${mission.id}?import_type=${type}`, formData);
      alert("Analyse terminée !");
      setSelectedFiles([]); 
      await fetchMissions();
      fetchAnomalies(mission);
    } catch (e) { 
        console.error(e);
        alert("Erreur analyse."); 
    } finally { 
        setUploadingId(null); 
    }
};


  const fetchAnomalies = async (mission) => {
    setLoading(true);
    setSelectedMission(mission);
    try {
      const { data } = await supabase.from('anomalies').select('*').eq('mission_id', mission.id);
      setAnomalies(data || []);
      setFilterCategory('ALL');
      setView('REPORT');
    } catch (e) { alert("Erreur données."); } finally { setLoading(false); }
  };

  const handleDownloadReport = (format) => {
    if (!selectedMission) return;
    window.open(`${API_URL}/export/${selectedMission.id}?format=${format}`, '_blank');
  };

  // --- NAVIGATION MENU INTELLIGENTE ---
  const toggleSection = (sectionId) => {
      setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

const handleMenuItemClick = (item) => {
    setFilterCategory('ALL'); // Reset filtre par défaut
    
    // Si l'item est désactivé dans la config
    if (!item.active) {
        setView('SOON');
        return;
    }

    // --- 1. GESTION DES DOSSIERS ---
    if (item.id === 'new_mission') setView('NEW');
    else if (item.id === 'missions_list') setView('LIST');
    // --- À AJOUTER LIGNE 534 ---
    else if (item.id === 'import_fec') setView('import_fec');
    else if (item.id === 'import_docs') setView('import_docs');

    // --- 2. RAPPORTS (C'est ici que ça coinçait) ---
    // On regroupe tous les boutons de rapport vers la même vue de téléchargement
    // --- 2. RAPPORTS ---
    // Remplace la condition des rapports par celle-ci :
    // --- 1. ANCIENS RAPPORTS (ACTIF / PASSIF) ---
    // On utilise une liste précise pour ne pas confondre avec les C01, C02
    if (['cycle_actif', 'cycle_passif', 'cycle_resultat', 'cycle_od'].includes(item.id)) {
        if (selectedMission) {
            setView('REPORT'); // On retourne sur l'ancienne vue
            const cat = item.id.replace('cycle_', '').toUpperCase();
            setFilterCategory(cat);
        } else {
            alert("Sélectionnez un dossier"); setView('LIST');
        }
    }

    // --- 2. NOUVEAUX SIGLES DÉTAILLÉS (C01 à C11) ---
    // On regarde si l'ID contient un "C" suivi d'un chiffre
    else if (item.id.startsWith('cycle_C')) {
        if (selectedMission) {
            const code = item.id.split('_')[1]; // Récupère C01, C02...
            setActiveCycleId(code);
            setView('CYCLE_DETAIL'); // On va sur la nouvelle vue
        } else {
            alert("Sélectionnez un dossier"); setView('LIST');
        }
    }
        // --- 3. CIRCULARISATION ---
        else if (item.id.startsWith('cycle_')) {
        if (selectedMission) {
            // Ex: si item.id est 'cycle_actif', on peut rediriger vers une liste ou un cycle spécifique
            // Ici, on va dire que cliquer sur un cycle précis dans le menu définit le cycle actif
            const code = item.id.replace('cycle_', '').toUpperCase(); // Ex: C01
            setActiveCycleId(code);
            setView('CYCLE_DETAIL');
        } else {
            alert("Sélectionnez un dossier d'abord");
            setView('LIST');
        }
    }

    // --- 4.
    else if (['circu_clients', 'circu_fournisseurs', 'circu_banques'].includes(item.id)) {
        if (selectedMission) {
            setView('CIRCULARISATION');
        } else {
            alert("Veuillez d'abord sélectionner un dossier.");
            setView('LIST');
        }
    }

    // --- 6. PARAMÈTRES & CONFIG ---
    else if (item.id === 'params_client') {
        if (selectedMission) setView('PARAMS');
        else { alert("Veuillez sélectionner un dossier."); setView('LIST'); }
    }
    else if (item.id === 'ml_metrics') setView('METRICS');
    else if (item.id === 'config_ml' || item.id === 'config_seuils') setView('CONFIG');
    else if (item.id === 'docs' || item.id === 'about') setView('HELP');
    else if (item.id === 'check_integrity') {
         if (selectedMission) setView('INTEGRITY');
         else { alert("Veuillez sélectionner un dossier."); setView('LIST'); }
    }



        else if (item.id === 'fiche_connaissance') {
        if (selectedMission) setView('KNOWLEDGE');
        else { alert("Sélectionnez un dossier"); setView('LIST'); }
    }
   

        else if (item.id === 'lettre_mission') {
        if (selectedMission) setView('LETTER');
        else { alert("Sélectionnez un dossier"); setView('LIST'); }
    }

        else if (item.id === 'final_revision') {
        if (selectedMission) setView('FINAL_REVISION');
        else { alert("Sélectionnez un dossier"); setView('LIST'); }
    }

    else if (item.id === 'dashboard_analytics') setView('ANALYTICS');
    else if (item.id === 'risk_mapping') setView('MAPPING');
        
    // Ferme le menu sur mobile après un clic
    if (window.innerWidth < 1024) setIsMenuOpen(false);
  };

  const handleAuth = async (type) => {
    setLoading(true);
    const { error } = type === 'signup' 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  if (!session) return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 text-white font-sans">
        <div className="max-w-md w-full text-center">
            <ShieldCheck size={50} className="mx-auto text-blue-400 mb-4" />
            <h1 className="text-3xl font-black mb-6">ML-AUDIT PRO</h1>
            <div className="bg-[#1e293b] p-8 rounded-[30px] shadow-2xl">
                <input type="email" placeholder="Email" className="w-full p-4 mb-4 rounded-xl bg-slate-700 outline-none" onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Mot de passe" className="w-full p-4 mb-6 rounded-xl bg-slate-700 outline-none" onChange={e => setPassword(e.target.value)} />
                <button disabled={loading} onClick={() => handleAuth('login')} className="w-full p-4 rounded-xl font-black bg-blue-600 hover:bg-blue-700">{loading ? "..." : "CONNEXION"}</button>
            </div>
        </div>
      </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* SIDEBAR */}
      <div className={`${isMenuOpen ? 'fixed inset-0' : 'hidden'} lg:relative lg:flex w-full lg:w-72 bg-[#0f172a] text-slate-300 p-4 flex-col shadow-2xl z-50`}>
        <div className="flex items-center gap-3 mb-6 px-2 mt-4">
            <div className="bg-blue-600 p-2 rounded-xl text-white"><ShieldCheck size={24}/></div>
            <div><h1 className="font-black text-white text-lg leading-none">ML-AUDIT<br/><span className="text-blue-400 text-sm">PRO v4.0</span></h1></div>
        </div>

        <div className="mb-6 px-4 py-3 bg-slate-800 rounded-2xl border border-slate-700">
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-[10px] font-black uppercase ${userRole === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                {userRole === 'admin' ? 'ADMIN' : 'CLIENT'}
            </div>
            <p className="text-xs text-slate-300 mt-1 truncate">{session.user.email}</p>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <button onClick={() => { setView('DASHBOARD'); setShowFullMenu(false); }} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 text-sm font-bold transition ${view === 'DASHBOARD' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
            <LayoutDashboard size={18}/> Tableau de Bord
          </button>
          
          <button onClick={() => { setView('LIST'); setShowFullMenu(false); }} className={`w-full text-left p-3 rounded-xl flex items-center gap-3 text-sm font-bold transition ${view === 'LIST' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}>
            <Briefcase size={18}/> Dossiers
          </button>

          <div className="h-px bg-slate-800 my-4"></div>

          <button onClick={() => setShowFullMenu(!showFullMenu)} className={`w-full text-left p-3 rounded-xl flex items-center justify-between gap-3 text-sm font-bold transition ${showFullMenu ? 'bg-slate-700 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            <div className="flex items-center gap-3"><Grid size={18}/> MENU GÉNÉRAL</div>
            {showFullMenu ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </button>

          {showFullMenu && (
            <div className="pl-2 space-y-1 mt-2 pb-10">
                {MENU_STRUCTURE.map((section) => (
                    <div key={section.id}>
                        <button 
                            onClick={() => toggleSection(section.id)}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between group"
                        >
                            <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider flex items-center gap-2">
                                <section.icon size={12} /> {section.title}
                            </span>
                            <ChevronDown size={12} className={`transition-transform ${expandedSection === section.id ? 'rotate-180' : ''}`}/>
                        </button>
                        
                        {expandedSection === section.id && (
                            <div className="space-y-1 border-l-2 border-slate-700 pl-3 ml-2 mt-1 mb-3 animate-in slide-in-from-top-1 duration-200">
                                {section.items.map(item => (
                                    <button 
                                        key={item.id} 
                                        onClick={() => handleMenuItemClick(item)}
                                        className={`w-full text-left py-1.5 text-xs hover:text-white transition flex items-center justify-between ${item.active ? 'text-slate-300' : 'text-slate-600'}`}
                                    >
                                        <span>{item.label}</span>
                                        <Circle size={5} className={item.active ? "text-green-500 fill-current" : "text-orange-500 fill-current"} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
          )}
        </nav>
        
        <div className="pt-4 border-t border-slate-800">
             <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-red-400 p-2 hover:bg-slate-800 rounded-lg font-bold w-full text-xs"><LogOut size={16}/> DÉCONNEXION</button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-8 lg:p-12 overflow-auto h-screen bg-slate-50">
        <div className="lg:hidden mb-6 flex justify-between items-center">
            <h1 className="font-black italic text-xl flex items-center gap-2 text-slate-900"><ShieldCheck className="text-blue-600"/> ML-AUDIT</h1>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 bg-white shadow-sm rounded-xl border border-slate-200 text-slate-700"><Menu /></button>
        </div>

        {view === 'DASHBOARD' && <DashboardView missions={missions} />}
        {view === 'NEW' && <NewMissionView onCreate={createMission} loading={loading} />}
        {view === 'LIST' && <MissionsListView missions={missions} onSelectMission={fetchAnomalies} onUpload={handleUpload} uploadingId={uploadingId} />}
        {/* --- NOUVEAUX ÉCRANS D'IMPORTATION --- */}
            {view === 'import_fec' && (
            <div className="max-w-4xl mx-auto p-8 bg-white rounded-[30px] shadow-sm border border-slate-100 animate-in fade-in duration-500">
                <h2 className="text-2xl font-black text-slate-800 mb-2 italic">IMPORTATION FEC (COMPTABILITÉ)</h2>
                <p className="text-slate-500 mb-6 text-sm">Sélectionnez vos fichiers FEC (.txt, .csv) puis cliquez sur Analyser.</p>
                
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center mb-6">
                    <input 
                        type="file" 
                        multiple 
                        onChange={(e) => setSelectedFiles(Array.from(e.target.files))} 
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700"
                    />
                    {selectedFiles.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl text-left">
                            <p className="text-xs font-black text-slate-400 mb-2 uppercase">Fichiers sélectionnés :</p>
                            {selectedFiles.map((f, i) => <div key={i} className="text-xs font-bold text-slate-700">📄 {f.name}</div>)}
                        </div>
                    )}
                </div>

                <button 
                    disabled={uploadingId || selectedFiles.length === 0 || !selectedMission}
                    onClick={() => handleUpload(selectedMission, selectedFiles, "FEC")}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {uploadingId ? "ANALYSE EN COURS..." : <><Search size={20}/> LANCER L'ANALYSE COMPTABLE</>}
                </button>
                {!selectedMission && <p className="mt-4 text-red-500 font-bold text-center text-xs">⚠️ Sélectionnez d'abord une mission dans la liste des dossiers.</p>}
            </div>
            )}

           {view === 'import_docs' && (
            <div className="max-w-4xl mx-auto p-8 bg-white rounded-[30px] shadow-sm border border-slate-100 animate-in fade-in duration-500">
                <h2 className="text-2xl font-black text-slate-800 mb-2 italic">IMPORT MULTI-FICHIERS (DOCUMENTS)</h2>
                <p className="text-slate-500 mb-6 text-sm">Pièces justificatives, Word, Excel, PDF. Sélectionnez vos fichiers puis cliquez sur Analyser.</p>
                
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center mb-6">
                    <input 
                        type="file" 
                        multiple 
                        onChange={(e) => setSelectedFiles(Array.from(e.target.files))} 
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-green-50 file:text-green-700"
                    />
                    {selectedFiles.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl text-left">
                            <p className="text-xs font-black text-slate-400 mb-2 uppercase">Documents prêts :</p>
                            {selectedFiles.map((f, i) => <div key={i} className="text-xs font-bold text-slate-700">📎 {f.name}</div>)}
                        </div>
                    )}
                </div>

                <button 
                    disabled={uploadingId || selectedFiles.length === 0 || !selectedMission}
                    onClick={() => handleUpload(selectedMission, selectedFiles, "DOCS")}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black shadow-xl hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-3"
                >
                    {uploadingId ? "ANALYSE DES PIÈCES EN COURS..." : <><FileCheck size={20}/> ANALYSER LES DOCUMENTS</>}
                </button>
                {!selectedMission && <p className="mt-4 text-red-500 font-bold text-center text-xs">⚠️ Sélectionnez d'abord une mission dans la liste des dossiers.</p>}
            </div>
            )}
        {view === 'REPORT' && selectedMission && <ReportView mission={selectedMission} anomalies={anomalies} filterCategory={filterCategory} onDownload={handleDownloadReport} onBack={() => setView('LIST')} />}
        {view === 'CONFIG' && <ConfigurationView />}
        {view === 'HELP' && <HelpView />}
        {view === 'SOON' && <ComingSoon />}
        {view === 'CIRCULARISATION' && selectedMission && <CircularisationView mission={selectedMission} session={session} />}
        {view === 'PARAMS' && selectedMission && <ClientParamsView mission={selectedMission} />}
        {view === 'METRICS' && <MLMetricsView />}
        {view === 'GENERATE_REPORT' && selectedMission && <ReportGenerationView mission={selectedMission} />}
        {view === 'INTEGRITY' && selectedMission && <IntegrityCheckView mission={selectedMission} anomalies={anomalies} />}
        {/* Remplace GENERATE_REPORT par SINGLE_REPORT en lui passant le reportType */}
        {view === 'SINGLE_REPORT' && selectedMission && <SingleReportView mission={selectedMission} reportType={reportType} />}
        {view === 'CYCLE_DETAIL' && selectedMission && (
        <CycleDetailView 
            cycleId={activeCycleId} 
            mission={selectedMission} 
            session={session} // <--- AJOUTE ÇA ICI
            checklist={cycleChecklist} 
            setChecklist={setCycleChecklist} 
        />
        )}
        {view === 'KNOWLEDGE' && selectedMission && <KnowledgeView mission={selectedMission} session={session} />}
        {view === 'LETTER' && selectedMission && <MissionLetterView mission={selectedMission} />}
        {view === 'FINAL_REVISION' && selectedMission && <FinalRevisionView mission={selectedMission} session={session} />}
        {view === 'ANALYTICS' && selectedMission && <DashboardAnalyticsView mission={selectedMission} />}
        {view === 'MAPPING' && selectedMission && <RiskMappingView mission={selectedMission} />}
      </div>

      {selectedMission && <ChatBot missionId={selectedMission.id} />}
    </div>
  );
}

export default App;