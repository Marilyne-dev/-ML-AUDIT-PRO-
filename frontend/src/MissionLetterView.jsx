import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Wand2, Download, Printer, Save, ImagePlus } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react';

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000" : "https://ml-audit-pro.onrender.com";

const MissionLetterView = ({ mission }) => {
  const [letterBody, setLetterBody] = useState(mission.engagement_letter || '');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/generate-letter/${mission.id}`);
      setLetterBody(res.data.lettre);
    } catch (e) { alert("Erreur génération"); }
    finally { setLoading(false); }
  };

  // NOUVEAU : Fonction pour sauvegarder les modifications faites à la main
  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/missions/${mission.id}`, { engagement_letter: letterBody });
      alert("✅ Lettre de mission et papier en-tête sauvegardés avec succès !");
    } catch (e) { 
      alert("Erreur lors de la sauvegarde."); 
    } finally { 
      setLoading(false); 
    }
  };

  // NOUVEAU : Fonction pour injecter un modèle de papier en-tête personnalisable
  const insertLetterhead = () => {
    const headerHtml = `
      <div style="text-align: center; border-bottom: 2px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #1e293b; margin: 0; font-size: 24px;">[NOM DE VOTRE CABINET]</h1>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 14px;">123 Avenue des Experts, 75000 Paris | Tél : 01 23 45 67 89 | Email : contact@cabinet.com</p>
          <p style="color: #64748b; font-size: 12px; margin: 5px 0 0 0; font-style: italic;">Société de Commissariat aux Comptes inscrite à la CRCC</p>
      </div>
      <br/>
    `;
    // On ajoute l'en-tête tout en haut du texte existant
    setLetterBody(headerHtml + letterBody);
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 italic flex items-center gap-3">
            <FileText className="text-blue-600" /> 1.2 Lettre de Mission
          </h2>
          <p className="text-slate-500 text-sm">Personnalisez votre papier en-tête ou générez le texte par IA.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
            {/* NOUVEAU BOUTON : Insérer En-tête */}
            <button onClick={insertLetterhead} className="p-3 bg-slate-100 text-slate-700 font-bold border border-slate-200 rounded-xl hover:bg-slate-200 transition flex items-center gap-2 text-sm">
                <ImagePlus size={18}/> AJOUTER EN-TÊTE
            </button>
            
            {/* BOUTON EXISTANT : Imprimer */}
            <button onClick={() => window.print()} className="p-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition" title="Imprimer">
                <Printer size={18}/>
            </button>

            {/* NOUVEAU BOUTON : Sauvegarder */}
            <button onClick={handleSave} disabled={loading} className="p-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition flex items-center gap-2 text-sm shadow-md">
                <Save size={18}/> {loading ? "..." : "SAUVEGARDER"}
            </button>

            {/* BOUTON EXISTANT : Générer par IA */}
            <button onClick={handleGenerate} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg transition text-sm">
                <Wand2 size={18} /> {loading ? "RÉDACTION..." : "GÉNÉRER PAR IA"}
            </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Rappel des Seuils (Persistance visuelle) */}
        <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase">Seuil Signification</p>
                <p className="text-xl font-black text-blue-700">{mission.seuil_signification?.toLocaleString()} €</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 opacity-60">
                <p className="text-[10px] font-black text-slate-400 uppercase">Seuil Planification</p>
                <p className="text-lg font-bold">{mission.seuil_planification?.toLocaleString()} €</p>
            </div>
            
            {/* NOUVEAU : Petite aide visuelle pour le client */}
            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 text-xs text-yellow-800">
                <strong>💡 Astuce :</strong> Utilisez l'outil "Image" dans la barre d'outils de l'éditeur pour importer votre vrai logo (ou copiez-collez-le directement dans le texte !). Pensez à <strong>Sauvegarder</strong> après modification.
            </div>
        </div>

        {/* L'ÉDITEUR DE LETTRE */}
        <div className="lg:col-span-3 bg-white p-2 rounded-[30px] shadow-2xl border border-slate-100">
            <Editor
                apiKey='fb5zbm350n2w99775iydkmdcwohs6cp0ogw0sqgqg3zvf0a5'
                value={letterBody}
                onEditorChange={(content) => setLetterBody(content)}
                init={{
                    height: 800, // Augmenté pour voir toute la lettre
                    menubar: true,
                    // J'ai gardé tous tes plugins intacts
                    plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'],
                    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image table | removeformat | help', // J'ai juste ajouté 'image table' en raccourci
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 20px; }'
                }}
            />
        </div>
      </div>
    </div>
  );
};

export default MissionLetterView;