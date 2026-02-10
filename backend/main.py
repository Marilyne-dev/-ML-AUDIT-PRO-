from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from ml_engine import AuditEngine, ask_claude_general
from typing import List
from pydantic import BaseModel
import pandas as pd
import io
import xlsxwriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from fastapi.responses import StreamingResponse
from datetime import datetime

# 1. Initialisation de l'application
app = FastAPI()


# 2. Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # L'étoile permet à TOUT le monde de se connecter (Idéal pour le développement/test)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Modèle pour la requête du Chatbot
class QuestionRequest(BaseModel):
    question: str

# ---------------------------------------------------------
# 3. ROUTE : CRÉER UNE MISSION
# ---------------------------------------------------------
@app.post("/missions")
async def create_mission_v4(data: dict):
    ca = float(data.get('chiffre_affaires_n', 0))
    res_net = float(data.get('resultat_net_n', 0))
    bilan = float(data.get('total_bilan', 0))

    # Calcul des seuils ISA 320
    s_signif = max(ca * 0.01, res_net * 0.05, bilan * 0.005)
    if s_signif == 0: s_signif = 1000

    # Gestion de l'année
    annee_txt = data.get('exercice_comptable', '2025')
    try: annee_int = int(annee_txt)
    except: annee_int = 2025

    mission_v4 = {
        "raison_sociale": data.get('raison_sociale'),
        "exercice_comptable": annee_txt,
        "exercice_n": annee_int,
        "chiffre_affaires_n": ca,
        "resultat_net_n": res_net,
        "total_bilan": bilan,
        "seuil_signification": round(s_signif, 2),
        "seuil_planification": round(s_signif * 0.75, 2),
        "seuil_remontee": round(s_signif * 0.05, 2),
        "client_email": data.get('client_email'),
        "statut": "Initialisée",
        "download_count": 0
    }

    try:
        res = supabase.table("missions").insert(mission_v4).execute()
        return res.data
    except Exception as e:
        print(f"ERREUR SQL : {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------
# 4. ROUTE : ANALYSE MULTI-FICHIERS (FEC, PDF, EXCEL)
# ---------------------------------------------------------
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, files: List[UploadFile] = File(...)):
    
    # On nettoie les anciennes anomalies pour cette mission (évite les doublons)
    supabase.table("anomalies").delete().eq("mission_id", mission_id).execute()
    
    engine = AuditEngine(mission_id)
    total_anomalies = []

    # BOUCLE SUR CHAQUE FICHIER UPLOADÉ
    for file in files:
        contents = await file.read()
        filename = file.filename.lower()
        print(f"📂 Analyse du fichier : {filename}")
        
        file_anomalies = []

        # A. CAS PDF / EXCEL (DOCUMENTAIRE)
        if filename.endswith('.pdf') or filename.endswith('.xlsx') or filename.endswith('.xls'):
            try:
                # Lecture intelligente via ml_engine
                texte_extrait = engine.lire_fichier_universel(contents, filename)
                
                if "ERREUR" in texte_extrait:
                    file_anomalies = [{
                        "cycle": "IMPORT", "type_anomalie": "ERREUR LECTURE",
                        "niveau_criticite": "FAIBLE", "score_ml": 0, "montant": 0,
                        "description": f"[{filename}] {texte_extrait}"
                    }]
                else:
                    # Analyse par l'IA du contenu du document
                    file_anomalies = engine.analyser_document_pdf_excel(texte_extrait)

            except Exception as e:
                print(f"Erreur sur {filename}: {e}")

        # B. CAS FEC (.txt, .csv)
        else:
            df = None
            # Test des séparateurs classiques
            separators = ['\t', ';', '|', ',']
            encodings = ['utf-8', 'latin1', 'cp1252']

            for encoding in encodings:
                for sep in separators:
                    try:
                        temp_df = pd.read_csv(io.BytesIO(contents), sep=sep, encoding=encoding, dtype=str, on_bad_lines='skip')
                        if temp_df.shape[1] > 1:
                            df = temp_df
                            break
                    except: continue
                if df is not None: break

            if df is not None:
                # Nettoyage des colonnes
                df.columns = [c.strip().lower() for c in df.columns]
                # Mapping pour s'assurer que les colonnes ont les bons noms
                mapping = {
                    'journalcode': 'journal_code', 'ecriturenum': 'ecriture_num',
                    'ecrituredate': 'ecriture_date', 'comptenum': 'compte_num',
                    'ecriturelib': 'ecriture_lib', 'debit': 'debit', 'credit': 'credit',
                    'compte': 'compte_num', 'libelle': 'ecriture_lib', 'date': 'ecriture_date'
                }
                df.rename(columns=mapping, inplace=True)
                
                # Vérification colonne obligatoire manquante
                required = ['journal_code', 'ecriture_date', 'compte_num', 'ecriture_lib', 'debit', 'credit']
                for col in required:
                    if col not in df.columns: df[col] = '' if col not in ['debit', 'credit'] else 0

                # Lancement de l'analyse FEC (Benford, Tracfin, etc.)
                file_anomalies = engine.executer_analyse_v4(df)

        # C. MARQUAGE ET AJOUT AU TOTAL
        for anom in file_anomalies:
            anom['mission_id'] = mission_id
            # On ajoute le nom du fichier au début de la description pour s'y retrouver
            anom['description'] = f"📄 [{file.filename}] {anom.get('description', '')}"
            total_anomalies.append(anom)

    # 3. SAUVEGARDE EN BASE
    if total_anomalies:
        # On insère par paquets de 50 pour éviter de bloquer
        batch_size = 50
        for i in range(0, len(total_anomalies), batch_size):
            try:
                batch = total_anomalies[i:i + batch_size]
                supabase.table("anomalies").insert(batch).execute()
            except Exception as e:
                print(f"Erreur insertion batch: {e}")
            
        supabase.table("missions").update({"statut": "Analysée"}).eq("id", mission_id).execute()

    return {"anomalies_detectees": len(total_anomalies)}


# ---------------------------------------------------------
# 5. ROUTE : CHATBOT INTELLIGENT
# ---------------------------------------------------------
@app.post("/chat/{mission_id}")
async def chat_audit(mission_id: str, req: QuestionRequest):
    question = req.question.lower().strip()
    
    # 1. Détection des salutations (pour répondre vite et poliment)
    greetings = ["bonjour", "salut", "hello", "coucou", "ca va", "ça va", "merci"]
    if any(g in question for g in greetings):
        return {"reponse": "Bonjour ! Je suis l'IA d'audit. Je vais bien, merci. Comment puis-je vous aider sur ce dossier ?"}

    # 2. Si c'est une vraie question -> On récupère le contexte (les anomalies)
    response = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
    anomalies = response.data if response.data else []
    
    # Construction du contexte pour l'IA
    if anomalies:
        contexte = f"Voici les {len(anomalies)} anomalies trouvées sur ce dossier :\n"
        for a in anomalies:
            contexte += f"- [{a.get('niveau_criticite', 'INFO')}] {a.get('type_anomalie', '')} : {a.get('description', '')} ({a.get('montant', 0)}€)\n"
    else:
        contexte = "Aucune anomalie n'a été détectée pour l'instant sur ce dossier."

    full_prompt = f"""
    CONTEXTE DU DOSSIER AUDIT :
    {contexte}

    QUESTION DE L'UTILISATEUR :
    {req.question}

    CONSIGNE : Réponds en tant qu'expert comptable. Base-toi sur le contexte ci-dessus. Sois précis et professionnel.
    """
    
    # Appel IA via la fonction asynchrone définie dans ml_engine
    engine = AuditEngine(mission_id)
    reponse_ia = await ask_claude_general(full_prompt, engine.api_key)
    
    return {"reponse": reponse_ia}


# ---------------------------------------------------------
# 6. ROUTE : TRACKING DES TÉLÉCHARGEMENTS
# ---------------------------------------------------------
@app.post("/track-download/{mission_id}")
async def track_download(mission_id: str):
    try:
        current = supabase.table("missions").select("download_count").eq("id", mission_id).execute()
        val = 0
        if current.data:
            val = current.data[0]['download_count'] or 0
            
        new_val = val + 1
        supabase.table("missions").update({"download_count": new_val}).eq("id", mission_id).execute()
        return {"success": True, "new_count": new_val}
    except Exception as e:
        print(f"Erreur tracking: {e}")
        return {"success": False, "error": str(e)}


# ---------------------------------------------------------
# 7. ROUTE : EXPORT (PDF, EXCEL, TXT)
# ---------------------------------------------------------
@app.get("/export/{mission_id}")
async def export_report(mission_id: str, format: str = "pdf"):
    # Récupérer les données
    mission_response = supabase.table("missions").select("*").eq("id", mission_id).execute()
    anomalies_response = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
    
    if not mission_response.data:
        raise HTTPException(status_code=404, detail="Mission introuvable")

    mission = mission_response.data[0]
    anomalies = anomalies_response.data or []
    
    # On incrémente le compteur
    await track_download(mission_id)

    # --- FORMAT PDF ---
    if format == "pdf":
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.setTitle(f"Rapport Audit - {mission['raison_sociale']}")
        
        # En-tête
        p.setFont("Helvetica-Bold", 16)
        p.setFillColor(colors.darkblue)
        p.drawString(50, 750, "RAPPORT D'AUDIT LÉGAL - ML-AUDIT PRO")
        
        p.setFont("Helvetica", 12)
        p.setFillColor(colors.black)
        p.drawString(50, 720, f"Client : {mission['raison_sociale']}")
        p.drawString(50, 705, f"Exercice : {mission.get('exercice_comptable', 'N/A')}")
        p.drawString(50, 690, f"Date : {datetime.now().strftime('%d/%m/%Y')}")
        
        y = 650
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "NIVEAU")
        p.drawString(120, y, "TYPE")
        p.drawString(250, y, "DESCRIPTION")
        p.drawRightString(550, y, "MONTANT")
        
        y -= 20
        p.setFont("Helvetica", 9)
        
        for a in anomalies:
            if y < 50:
                p.showPage()
                y = 750
            
            # Couleur selon criticité
            if a.get('niveau_criticite') == 'CRITIQUE':
                p.setFillColor(colors.red)
            elif a.get('niveau_criticite') == 'ELEVE':
                p.setFillColor(colors.orange)
            else:
                p.setFillColor(colors.black)
                
            p.drawString(50, y, str(a.get('niveau_criticite', 'INFO')))
            p.drawString(120, y, str(a.get('type_anomalie', ''))[:20])
            p.setFillColor(colors.black)
            p.drawString(250, y, str(a.get('description', ''))[:60] + "...")
            
            montant = f"{a.get('montant', 0):,.2f} €"
            p.drawRightString(550, y, montant)
            y -= 20

        p.save()
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Rapport_{mission['raison_sociale']}.pdf"})

    # --- FORMAT EXCEL ---
    elif format == "xlsx":
        buffer = io.BytesIO()
        # On prépare les données proprement
        data_export = []
        for a in anomalies:
            data_export.append({
                "Niveau": a.get('niveau_criticite'),
                "Cycle": a.get('cycle'),
                "Type": a.get('type_anomalie'),
                "Description": a.get('description'),
                "Montant": a.get('montant', 0),
                "Score ML": a.get('score_ml')
            })
            
        df = pd.DataFrame(data_export)
        with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Anomalies', index=False)
            # Auto-ajustement des colonnes (optionnel mais sympa)
            worksheet = writer.sheets['Anomalies']
            worksheet.set_column('D:D', 50) # Largeur description
            
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=Rapport_{mission['raison_sociale']}.xlsx"})

    # --- FORMAT TXT (Par défaut) ---
    else:
        content = f"RAPPORT AUDIT - {mission['raison_sociale']}\n"
        content += f"Généré le {datetime.now().strftime('%d/%m/%Y')}\n"
        content += "="*60 + "\n\n"
        
        total = 0
        for i, a in enumerate(anomalies):
            content += f"ANOMALIE #{i+1}\n"
            content += f"Type: {a.get('type_anomalie')} ({a.get('niveau_criticite')})\n"
            content += f"Montant: {a.get('montant')} €\n"
            content += f"Détail: {a.get('description')}\n"
            content += "-"*40 + "\n"
            total += (a.get('montant') or 0)
            
        content += f"\nIMPACT TOTAL : {total:,.2f} €"
        
        return StreamingResponse(io.BytesIO(content.encode()), media_type="text/plain", headers={"Content-Disposition": f"attachment; filename=Rapport_{mission['raison_sociale']}.txt"})


# ... (tout ton code précédent) ...

# ---------------------------------------------------------
# 8. ROUTE RACINE (Pour vérifier que le serveur est en ligne)
# ---------------------------------------------------------
@app.get("/")
def read_root():
    return {"status": "ML-AUDIT PRO API is running", "version": "4.0"}        