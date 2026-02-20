import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Wand2, Download, Printer, Save } from 'lucide-react';
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

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-500 pb-20">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-900 italic flex items-center gap-3">
            <FileText className="text-blue-600" /> 1.2 Lettre de Mission
          </h2>
          <p className="text-slate-500 text-sm">Génération automatique basée sur les seuils ISA 320.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition"><Printer size={18}/></button>
            <button onClick={handleGenerate} disabled={loading} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black flex items-center gap-2 hover:bg-blue-700 shadow-lg transition">
                <Wand2 size={18} /> {loading ? "IA EN RÉDACTION..." : "GÉNÉRER PAR IA"}
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
        </div>

        {/* L'ÉDITEUR DE LETTRE */}
        <div className="lg:col-span-3 bg-white p-2 rounded-[30px] shadow-2xl border border-slate-100">
            <Editor
                apiKey='fb5zbm350n2w99775iydkmdcwohs6cp0ogw0sqgqg3zvf0a5'
                value={letterBody}
                onEditorChange={(content) => setLetterBody(content)}
                init={{
                    height: 600,
                    menubar: true,
                    plugins: ['advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview', 'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen', 'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'],
                    toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px; padding: 20px; }'
                }}
            />
        </div>
      </div>
    </div>
  );
};

export default MissionLetterView;