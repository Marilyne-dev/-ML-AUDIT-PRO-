import React, { useState } from 'react';
import axios from 'axios';
import { Mail, Upload, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { Editor } from '@tinymce/tinymce-react'; // L'éditeur comme Moodle

const API_URL = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ? "http://127.0.0.1:8000"
  : "https://ml-audit-pro.onrender.com";

const CircularisationView = ({ mission }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [tiersList, setTiersList] = useState([]);
  const [typeCircu, setTypeCircu] = useState("CLIENT");
  
  // États pour l'édition d'un mail spécifique
  const [selectedTierIndex, setSelectedTierIndex] = useState(null);
  const [editorContent, setEditorContent] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');

  const handleAnalyze = async () => {
    if (!file || !mission) return alert("Veuillez sélectionner un fichier.");
    setLoading(true);
    setTiersList([]);
    setSelectedTierIndex(null);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API_URL}/circularisation/${mission.id}?type_circu=${typeCircu}`, formData);
      setTiersList(res.data.tiers || []);
    } catch (e) {
      alert("Erreur analyse : " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (index, tier) => {
    setSelectedTierIndex(index);
    // On convertit les sauts de ligne en <br> pour l'éditeur HTML
    const htmlContent = tier.template_mail.replace(/\n/g, '<br/>');
    setEditorContent(htmlContent);
    setCurrentEmail(tier.email_estime || '');
  };

  const handleSendEmail = async () => {
    if (!currentEmail) return alert("L'adresse email du destinataire est obligatoire !");
    
    setSending(true);
    try {
        const res = await axios.post(`${API_URL}/send-email`, {
            destinataire: currentEmail,
            sujet: `Confirmation de solde - ${mission.raison_sociale}`,
            corps: editorContent // Envoi du HTML (gras, italique...)
        });

        if (res.data.success) {
            alert("✅ Email envoyé avec succès !");
            // On marque le tier comme "Envoyé" visuellement
            const newList = [...tiersList];
            newList[selectedTierIndex].statut = 'ENVOYÉ';
            setTiersList(newList);
            setSelectedTierIndex(null); // On ferme l'éditeur
        } else {
            alert("Erreur : " + res.data.message);
        }
    } catch (e) {
        alert("Erreur technique : " + e.message);
    } finally {
        setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in zoom-in duration-300 pb-20">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 italic flex items-center gap-3">
          <Mail className="text-blue-600" /> Circularisation & Envoi
        </h2>
        <p className="text-slate-500 text-sm">Génération, édition et envoi des demandes de confirmation.</p>
      </header>

      {/* 1. CHOIX DU TYPE & UPLOAD */}
      <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 mb-8">
        <div className="flex gap-4 mb-6">
            <button onClick={() => setTypeCircu("CLIENT")} className={`px-4 py-2 rounded-lg font-bold text-xs transition ${typeCircu === 'CLIENT' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>CLIENTS (411)</button>
            <button onClick={() => setTypeCircu("FOURNISSEUR")} className={`px-4 py-2 rounded-lg font-bold text-xs transition ${typeCircu === 'FOURNISSEUR' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>FOURNISSEURS (401)</button>
            <button onClick={() => setTypeCircu("BANQUE")} className={`px-4 py-2 rounded-lg font-bold text-xs transition ${typeCircu === 'BANQUE' ? 'bg-blue-600 text-white' : 'bg-slate-100'}`}>BANQUES (512)</button>
        </div>

        <div className="flex items-center gap-4">
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
            <button onClick={handleAnalyze} disabled={loading || !file} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50">
                {loading ? "Analyse..." : "1. ANALYSER LE FICHIER"}
            </button>
        </div>
      </div>

      {/* 2. LISTE DES TIERS DÉTECTÉS */}
      {tiersList.length > 0 && !selectedTierIndex && selectedTierIndex !== 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiersList.map((tier, idx) => (
                <div key={idx} className={`relative p-6 rounded-2xl border transition hover:shadow-lg ${tier.statut === 'ENVOYÉ' ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-start mb-4">
                        <h4 className="font-black text-slate-800 truncate pr-2">{tier.nom}</h4>
                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold">{tier.solde} €</span>
                    </div>

                    {/* ALERTE EMAIL */}
                    {tier.email_estime ? (
                        <div className="flex items-center gap-2 text-xs text-green-600 font-bold mb-4 bg-green-50 p-2 rounded-lg">
                            <CheckCircle size={14}/> Email trouvé : {tier.email_estime}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-xs text-red-500 font-bold mb-4 bg-red-50 p-2 rounded-lg animate-pulse">
                            <AlertTriangle size={14}/> Email introuvable !
                        </div>
                    )}

                    <button 
                        onClick={() => openEditor(idx, tier)}
                        className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 ${tier.statut === 'ENVOYÉ' ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                    >
                        {tier.statut === 'ENVOYÉ' ? 'RENVOYER' : 'PRÉPARER L\'ENVOI'} <Send size={14}/>
                    </button>
                </div>
            ))}
        </div>
      )}

      {/* 3. ÉDITEUR (MODE MODIFICATION) */}
      {selectedTierIndex !== null && (
        <div className="bg-white rounded-[30px] shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-10 fixed inset-4 md:inset-10 z-50 flex flex-col">
            
            {/* Header de l'éditeur */}
            <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h3 className="text-xl font-black text-slate-800">Préparation de l'email pour : <span className="text-blue-600">{tiersList[selectedTierIndex].nom}</span></h3>
                    <p className="text-sm text-slate-500">Vous pouvez modifier le texte et l'email avant envoi.</p>
                </div>
                <button onClick={() => setSelectedTierIndex(null)} className="text-slate-400 hover:text-slate-600 font-bold">FERMER X</button>
            </div>

            {/* Corps de l'éditeur */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                <div className="max-w-4xl mx-auto space-y-4">
                    
                    {/* CHAMP EMAIL (CRITIQUE) */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destinataire (Email)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="email" 
                                value={currentEmail} 
                                onChange={(e) => setCurrentEmail(e.target.value)}
                                placeholder="ex: contact@entreprise.com"
                                className={`w-full p-3 rounded-lg border outline-none font-medium ${!currentEmail ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                            />
                            {!currentEmail && <span className="text-xs text-red-500 font-bold whitespace-nowrap">REQUISE !</span>}
                        </div>
                    </div>

                    {/* ÉDITEUR RICH TEXT (TINYMCE) */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200 h-[400px]">
                        <Editor
                            apiKey='fb5zbm350n2w99775iydkmdcwohs6cp0ogw0sqgqg3zvf0a5' // Utilise la version gratuite (peut afficher un warning en console locale, mais marche)
                            value={editorContent}
                            onEditorChange={(newContent) => setEditorContent(newContent)}
                            init={{
                                height: 400,
                                menubar: false,
                                plugins: [
                                   'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
                                   'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                                   'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
                                ],
                                toolbar: 'undo redo | blocks | ' +
                                   'bold italic forecolor | alignleft aligncenter ' +
                                   'alignright alignjustify | bullist numlist outdent indent | ' +
                                   'removeformat | help',
                                content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-4">
                <button onClick={() => setSelectedTierIndex(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50">ANNULER</button>
                <button 
                    onClick={handleSendEmail} 
                    disabled={sending || !currentEmail}
                    className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 shadow-xl"
                >
                    {sending ? "ENVOI EN COURS..." : "ENVOYER L'EMAIL MAINTENANT"} <Send size={18}/>
                </button>
            </div>
        </div>
      )}
    </div>
  );
};

export default CircularisationView;