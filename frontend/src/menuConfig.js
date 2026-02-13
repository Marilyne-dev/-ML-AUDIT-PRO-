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
      { id: 'params_client', label: 'Paramètres Client', active: true },
      { id: 'seuils_isa', label: 'Calcul Seuils ISA 320', active: true }
    ]
  },
  {
    id: 'section_2',
    title: "2. IMPORT DONNÉES",
    icon: Upload,
    items: [
      { id: 'import_excel', label: 'Import Excel (.xlsx)', active: true },
      { id: 'import_fec', label: 'Import FEC (.txt/csv)', active: true },
      { id: 'import_balance', label: 'Import Balance', active: true },
      { id: 'check_integrity', label: 'Contrôles Intégrité', active: true }
    ]
  },
  {
    id: 'section_3',
    title: "3. ANALYSE ML",
    icon: Search,
    items: [
      { id: 'analysis_global', label: 'Analyse Complète', active: true },
      { id: 'benford', label: 'Analyse Benford', active: true },
      { id: 'ml_metrics', label: 'Métriques Modèle', active: true }
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
  {
    id: 'section_6',
    title: "6. RAPPORTS",
    icon: FileText,
    items: [
      { id: 'report_cac', label: 'Rapport CAC Complet', active: true },
      { id: 'report_synthese', label: 'Synthèse Exécutive', active: true },
      { id: 'opinion', label: 'Recommandation Opinion', active: true }
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
    id: 'section_8',
    title: "8. CONFIGURATION",
    icon: Settings,
    items: [
      { id: 'config_ml', label: 'Paramètres ML', active: true },
      { id: 'config_seuils', label: 'Seuils d\'alerte', active: true }
    ]
  },
  {
    id: 'section_9',
    title: "9. AIDE",
    icon: HelpCircle,
    items: [
      { id: 'docs', label: 'Documentation', active: true },
      { id: 'about', label: 'À propos', active: true }
    ]
  },

  {
    id: 'section_circu', // NOUVELLE SECTION
    title: "CIRCULARISATION",
    icon: Mail,
    items: [
      { id: 'circu_clients', label: 'Confirmation Clients', active: true },
      { id: 'circu_fournisseurs', label: 'Confirmation Fournisseurs', active: true }
    ]
  },
];