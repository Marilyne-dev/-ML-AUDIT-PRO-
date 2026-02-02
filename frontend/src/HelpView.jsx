// src/HelpView.jsx
import React from 'react';
import { HelpCircle, BookOpen, Info, Phone, MapPin } from 'lucide-react';

const HelpView = () => {
  return (
    <div className="max-w-4xl mx-auto animate-in fade-in zoom-in duration-300">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter italic flex items-center gap-3">
          <HelpCircle className="text-blue-600" /> Centre d'Aide
        </h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Documentation */}
        <div className="bg-white p-8 rounded-[30px] shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-4">
                <BookOpen size={24}/>
            </div>
            <h3 className="font-black text-xl text-slate-800 mb-2">Documentation</h3>
            <p className="text-sm text-slate-500 mb-6">Accédez aux guides d'utilisation et aux références normatives (NEP/ISA).</p>
            <ul className="space-y-3">
                <li className="text-sm font-bold text-blue-600 cursor-pointer hover:underline">• Guide des 21 Cycles d'Audit</li>
                <li className="text-sm font-bold text-blue-600 cursor-pointer hover:underline">• Manuel d'utilisation v4.0</li>
                <li className="text-sm font-bold text-blue-600 cursor-pointer hover:underline">• FAQ Technique</li>
            </ul>
        </div>

        {/* À Propos (Infos Client) */}
        <div className="bg-[#0f172a] p-8 rounded-[30px] shadow-xl text-white">
            <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center text-white mb-4">
                <Info size={24}/>
            </div>
            <h3 className="font-black text-xl mb-1">ML-AUDIT PRO v4.0</h3>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-6">Système Expert d'Audit Légal</p>
            
            <div className="space-y-4 border-t border-slate-700 pt-6">
                <div>
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Développé pour</p>
                    <p className="font-bold text-lg">RVJ AUDIT & EXPERTISE</p>
                </div>
                <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-blue-400 mt-1"/>
                    <p className="text-sm text-slate-300">Fort-de-France<br/>Martinique</p>
                </div>
                <div className="flex items-center gap-3">
                    <Phone size={18} className="text-blue-400"/>
                    <p className="text-sm text-slate-300">Support Technique : +596 ...</p>
                </div>
            </div>
            <div className="mt-8 text-center text-[10px] text-slate-600">
                © 2025 - Tous droits réservés
            </div>
        </div>

      </div>
    </div>
  );
};

export default HelpView;