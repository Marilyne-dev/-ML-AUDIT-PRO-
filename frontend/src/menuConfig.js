// src/menuConfig.js
import { 
    Folder, Upload, Search, BarChart3, AlertTriangle, 
    FileText, Scale, Settings, HelpCircle 
} from 'lucide-react';
import { Mail } from 'lucide-react'; 

export const MENU_STRUCTURE = [
  {
    id: 'section_1',
    title: "1. GESTION DES MISSIONS",
    icon: Folder,
    items: [
      { id: 'new_mission', label: 'Nouvelle Mission', active: true },
      { id: 'missions_list', label: 'Portefeuille Clients', active: true },
      { id: 'fiche_connaissance', label: 'Fiche de connaissance', active: true }, // <--- ON ACTIVE ÇA
      { id: 'lettre_mission', label: 'Lettre de Mission (Générateur)', active: true }, // <--- ON ACTIVE ÇA
      { id: 'seuils_isa', label: 'Calcul Seuils ISA 320', active: true }
    ]
  },
  {
    id: 'section_2',
    title: "2. COLLECTE DES DONNÉES",
    icon: Upload,
    items: [
      { id: 'import_fec', label: 'Importation FEC (Comptabilité)', active: true },
      { id: 'import_docs', label: 'Import Multi-fichiers (PDF, Word, Excel)', active: true },
      { id: 'check_integrity', label: 'Contrôle Intégrité & Balance', active: true } 
    ]
  },
  {
    id: 'section_3',
    title: "3. ANALYSE IA & COCKPIT",
    icon: Search,
    items: [
      { id: 'dashboard_analytics', label: 'Dashboard & Cartographie PRO', active: true },
      { id: 'benford', label: 'Analyse Loi de Benford', active: true }
    ]
  },
  {
    id: 'section_4',
    title: "4. RÉSULTATS PAR CYCLE",
    icon: BarChart3,
    items: [
      { id: 'cycle_actif', label: 'Cycles ACTIF', active: true },
      { id: 'cycle_passif', label: 'Cycles PASSIF', active: true },
      { id: 'cycle_resultat', label: 'Cycles RÉSULTAT', active: true },
      { id: 'cycle_od', label: 'Opérations Diverses', active: true }
    ]
  },
  {
    id: 'section_5',
    title: "5. ALERTES & ANOMALIES",
    icon: AlertTriangle,
    items: [
      { id: 'dashboard_alerts', label: 'Dashboard Alertes', active: true },
      { id: 'anomalies_critiques', label: 'Anomalies CRITIQUES', active: true },
      { id: 'fiche_anomalie', label: 'Fiches Détaillées', active: true }
    ]
  },
  // Dans menuConfig.js, section_6 par exemple :
  {
      id: 'section_6',
      title: "6. RAPPORTS & CONCLUSION",
      icon: FileText,
      items: [
        { id: 'final_revision', label: 'Révision Finale des Comptes', active: true }, // <--- ON AJOUTE ÇA
        { id: 'report_cac', label: 'Rapport CAC Complet', active: true },
        { id: 'opinion', label: 'Opinion d\'Audit', active: true }
      ]
  },
  {
    id: 'section_7',
    title: "7. OBLIGATIONS LÉGALES",
    icon: Scale,
    items: [
      { id: 'legal_tracfin', label: 'Alertes TRACFIN', active: true },
      { id: 'procureur', label: 'Révélation Procureur', active: true },
      { id: 'continuite', label: 'Continuité Exploitation', active: true },
      { id: 'conventions', label: 'Conventions Réglementées', active: true }
    ]
  },

  {
    id: 'section_circu', // NOUVELLE SECTION
    title: "8.CIRCULARISATION",
    icon: Mail,
    items: [
      { id: 'circu_clients', label: 'Confirmation Clients', active: true },
      
    ]
  },

  {
    id: 'section_cycle_detail', // Nouvel ID
    title: "9. TRAVAUX PAR CYCLE (SIGLES)",
    icon: BarChart3,
    items: [
      { id: 'cycle_C01', label: 'C01 - Ventes & Clients', active: true },
      { id: 'cycle_C02', label: 'C02 - Achats & Fournisseurs', active: true },
      { id: 'cycle_C03', label: 'C03 - Trésorerie', active: true },
      { id: 'cycle_C04', label: 'C04 - Stocks', active: true },
      { id: 'cycle_C05', label: 'C05 - Immobilisations', active: true },
      { id: 'cycle_C06', label: 'C06 - Paie – Personnel', active: true },
      { id: 'cycle_C07', label: 'C07 - Fiscal', active: true },
      { id: 'cycle_C08', label: 'C08 - Capitaux Propres', active: true },
      { id: 'cycle_C09', label: 'C09 - Emprunts et Dettes Fin.', active: true },
      { id: 'cycle_C10', label: 'C10 - Autres Provisions / Engagements', active: true },
      { id: 'cycle_C11', label: 'C11 - Contrôle Interne', active: true },

      // Tu peux ajouter les autres C06 à C11 ici plus tard
    ]
  },

  {
    id: 'section_8',
    title: " CONFIGURATION",
    icon: Settings,
    items: [
      { id: 'config_ml', label: 'Paramètres ML', active: true },
      
    ]
  },
  {
    id: 'section_9',
    title: "AIDE",
    icon: HelpCircle,
    items: [
      
      { id: 'about', label: 'À propos', active: true }
    ]
  },
];