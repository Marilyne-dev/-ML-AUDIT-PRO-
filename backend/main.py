from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from ml_engine import AuditEngine, ask_claude_general
from typing import List
import pandas as pd
import io
import xlsxwriter
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from fastapi.responses import StreamingResponse
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel
from datetime import datetime # Import unique et propre
import os
from dotenv import load_dotenv
from fastapi import Form 
load_dotenv()
app = FastAPI()


import os
from dotenv import load_dotenv

load_dotenv()   # charge le .env

# 1. Initialisation de l'application
app = FastAPI()


# 2. Configuration CORS
# 2. Configuration CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Liste précise au lieu de "*"
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
    user_id = data.get('user_id') 
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
# ---------------------------------------------------------
# 4. ROUTE : ANALYSE MULTI-FICHIERS (CORRIGÉE & OPTIMISÉE)
# ---------------------------------------------------------
@app.post("/analyze/{mission_id}")
async def analyze_v4(
    mission_id: str,
    files: List[UploadFile] = File(...),
    import_type: str = "FEC",  # "FEC" ou "DOCS"
    user_id: str = Form(...) 
):
    """
    Analyse universelle :
    - DOCS  → analyse documentaire / SIGLES
    - FEC   → analyse FEC / Excel / CSV / PDF
    """

    # =======================
    # Nettoyage anciennes anomalies
    # =======================
    supabase.table("anomalies").delete().eq("mission_id", mission_id).execute()

    engine = AuditEngine(mission_id)
    total_anomalies = []

    # =======================
    # BOUCLE SUR CHAQUE FICHIER
    # =======================
    for file in files:
        contents = await file.read()
        filename = file.filename.lower()

        file_anomalies = []
        df = None

        # =====================================================
        # CAS 1 : MODE DOCUMENTAIRE / SIGLES
        # =====================================================
        if import_type == "DOCS":

            try:
                texte = engine.lire_fichier_universel(contents, filename)
                file_anomalies = engine.analyser_document_pdf_excel(
                    texte,
                    is_sigle=True
                )
            except Exception as e:
                print("Erreur analyse DOCS :", e)
                file_anomalies = []

        # =====================================================
        # CAS 2 : MODE FEC / CLASSIQUE
        # =====================================================
        else:

            # =======================
            # EXCEL
            # =======================
            if filename.endswith(('.xlsx', '.xls')):

                df = engine.convertir_excel_en_df(contents)

                if df is not None:
                    file_anomalies = engine.executer_analyse_v4(df)
                else:
                    texte = engine.lire_fichier_universel(contents, filename)
                    file_anomalies = engine.analyser_document_pdf_excel(texte)

            # =======================
            # PDF
            # =======================
            elif filename.endswith('.pdf'):

                try:
                    texte = engine.lire_fichier_universel(contents, filename)
                    file_anomalies = engine.analyser_document_pdf_excel(texte)
                except Exception as e:
                    print("Erreur PDF :", e)
                    file_anomalies = []

            # =======================
            # CSV / TXT / FEC
            # =======================
            else:

                separators = ['\t', ';', '|', ',']
                encodings = ['utf-8', 'latin1', 'cp1252']

                for encoding in encodings:
                    for sep in separators:
                        try:
                            temp_df = pd.read_csv(
                                io.BytesIO(contents),
                                sep=sep,
                                encoding=encoding,
                                dtype=str,
                                on_bad_lines='skip'
                            )
                            if temp_df.shape[1] > 1:
                                df = temp_df
                                break
                        except:
                            continue
                    if df is not None:
                        break

                if df is not None:
                    df.columns = [c.strip().lower() for c in df.columns]

                    mapping = {
                        'journalcode': 'journal_code',
                        'ecriturenum': 'ecriture_num',
                        'ecrituredate': 'ecriture_date',
                        'comptenum': 'compte_num',
                        'ecriturelib': 'ecriture_lib',
                        'debit': 'debit',
                        'credit': 'credit',
                        'compte': 'compte_num',
                        'libelle': 'ecriture_lib',
                        'date': 'ecriture_date'
                    }
                    df.rename(columns=mapping, inplace=True)

                    if 'debit' not in df.columns:
                        df['debit'] = 0
                    if 'credit' not in df.columns:
                        df['credit'] = 0

                    file_anomalies = engine.executer_analyse_v4(df)

        # =====================================================
        # SI AUCUNE ANOMALIE → INFO
        # =====================================================
        if not file_anomalies:
            file_anomalies.append({
                "cycle": "IMPORT",
                "type_anomalie": "INFO",
                "niveau_criticite": "FAIBLE",
                "score_ml": 0,
                "montant": 0,
                "description": "Fichier analysé : aucune anomalie détectée."
            })

        # =====================================================
        # AJOUT GLOBAL
        # =====================================================
        for anom in file_anomalies:
            anom["mission_id"] = mission_id
            anom["description"] = f"[{file.filename}] {anom.get('description','')}"
            total_anomalies.append(anom)

    # =====================================================
    # SAUVEGARDE SUPABASE
    # =====================================================
    if total_anomalies:

        batch_size = 50
        for i in range(0, len(total_anomalies), batch_size):
            batch = total_anomalies[i:i + batch_size]
            supabase.table("anomalies").insert(batch).execute()

        supabase.table("missions").update(
            {"statut": "Analysée"}
        ).eq("id", mission_id).execute()

    return {
        "mission_id": mission_id,
        "anomalies_detectees": len(total_anomalies),
        "mode": import_type
    }


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
   # --- FORMAT EXCEL ---
    elif format == "xlsx":
        try:
            buffer = io.BytesIO()
            
            # Préparation des données
            data_export = []
            for a in anomalies:
                data_export.append({
                    "Niveau": a.get('niveau_criticite', 'INFO'),
                    "Cycle": a.get('cycle', 'N/A'),
                    "Type": a.get('type_anomalie', 'Inconnu'),
                    "Description": a.get('description', ''),
                    "Montant": float(a.get('montant', 0) or 0), # Sécurité si None
                    "Score ML": a.get('score_ml', 0)
                })

            # Création du DataFrame
            df = pd.DataFrame(data_export)

            # Si le DataFrame est vide, on crée quand même les colonnes pour ne pas planter
            if df.empty:
                df = pd.DataFrame(columns=["Niveau", "Cycle", "Type", "Description", "Montant", "Score ML"])

            # Écriture avec XlsxWriter
            with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
                df.to_excel(writer, sheet_name='Anomalies', index=False)
                
                # Mise en forme (Largeur des colonnes)
                workbook  = writer.book
                worksheet = writer.sheets['Anomalies']
                
                # Format monétaire
                money_fmt = workbook.add_format({'num_format': '#,##0.00 €'})
                
                # Application des largeurs
                worksheet.set_column('A:A', 15) # Niveau
                worksheet.set_column('B:C', 20) # Cycle & Type
                worksheet.set_column('D:D', 60) # Description (Large)
                worksheet.set_column('E:E', 15, money_fmt) # Montant
                worksheet.set_column('F:F', 10) # Score

            buffer.seek(0)
            
            headers = {
                "Content-Disposition": f"attachment; filename=Rapport_{mission['raison_sociale']}.xlsx"
            }
            return StreamingResponse(
                buffer, 
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
                headers=headers
            )

        except Exception as e:
            print(f"ERREUR EXPORT EXCEL : {str(e)}") # Affiche l'erreur dans le terminal
            raise HTTPException(status_code=500, detail=f"Erreur création Excel: {str(e)}")
        

        

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

# ---------------------------------------------------------
# AJOUT : ROUTE CIRCULARISATION (Marilyne - Demande 6 & 9)
# ---------------------------------------------------------
# ---------------------------------------------------------
# CIRCULARISATION — GENERATION + SAUVEGARDE
# ---------------------------------------------------------
from datetime import datetime

@app.post("/circularisation/{mission_id}")
async def generate_circularisation(
    mission_id: str,
    file: UploadFile = File(...),
    type_circu: str = "CLIENT"
):
    try:
        contents = await file.read()
        engine = AuditEngine(mission_id)

        texte_brut = engine.lire_fichier_universel(contents, file.filename)

        tiers_data = await engine.extraire_tiers_pour_circularisation(
            texte_brut,
            type_circu
        )

        if not tiers_data:
            return {
                "mission_id": mission_id,
                "nb_tiers": 0,
                "tiers": [],
                "message": "Aucun tiers détecté"
            }

        resultats = []

        for tiers in tiers_data:

            montant = float(tiers.get("montant", 0) or 0)
            nom = tiers.get("nom", "Inconnu")
            email = tiers.get("email", "")

            mail_body = f"""
Objet : Demande de confirmation de solde - Audit {datetime.now().year}

Madame, Monsieur,

Dans le cadre de notre audit, merci de confirmer le solde arrêté au 31/12.

Solde selon nos livres : {montant} EUR

Merci de signaler tout écart.

Cordialement,
Le Commissaire aux Comptes.
"""

            circu_obj = {
                "mission_id": mission_id,
                "tiers_nom": nom,
                "montant": montant,
                "email": email,
                "statut": "A PREPARER",
                "template_mail": mail_body,
                "type": type_circu,
                "date_generation": datetime.utcnow().isoformat()
            }

            res = supabase.table("circularisations").insert(circu_obj).execute()

            if res.data:
                resultats.append(res.data[0])

        return {
            "mission_id": mission_id,
            "nb_tiers": len(resultats),
            "tiers": resultats
        }

    except Exception as e:
        print("❌ ERREUR CIRCULARISATION :", e)
        raise HTTPException(status_code=500, detail=str(e))

# ---------------------------------------------------------
# LISTE CIRCULARISATIONS
# ---------------------------------------------------------
# 7. CIRCULARISATION (SAUVEGARDE PRO)
# ---------------------------------------------------------
@app.post("/circularisation/{mission_id}")
async def generate_circularisation(mission_id: str, file: UploadFile = File(...), type_circu: str = "CLIENT"):
    try:
        contents = await file.read()
        engine = AuditEngine(mission_id)
        texte_brut = engine.lire_fichier_universel(contents, file.filename)
        tiers_data = await engine.extraire_tiers_pour_circularisation(texte_brut, type_circu)
        
        resultats = []
        for tiers in tiers_data:
            circu_obj = {
                "mission_id": mission_id,
                "tiers_nom": tiers.get("nom", "Inconnu"),
                "montant": float(tiers.get("montant", 0) or 0),
                "email": tiers.get("email", ""),
                "statut": "A PREPARER",
                "template_mail": f"Madame, Monsieur,\n\nMerci de confirmer votre solde de {tiers.get('montant')} EUR.",
                "type": type_circu # Vérifie que cette colonne existe en base !
            }
            res = supabase.table("circularisations").insert(circu_obj).execute()
            if res.data: resultats.append(res.data[0])
        return {"tiers": resultats}
    except Exception as e:
        print(f"ERREUR CRITIQUE CIRCULARISATION : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/circularisation/{mission_id}")
async def get_circularisations(mission_id: str):
    res = supabase.table("circularisations").select("*").eq("mission_id", mission_id).execute()
    return res.data

@app.patch("/circularisation/status/{circu_id}")
async def update_circu_status(circu_id: str, data: dict):
    res = supabase.table("circularisations").update({"statut": data.get("statut")}).eq("id", circu_id).execute()
    return {"success": True, "data": res.data}

    

class EmailRequest(BaseModel):
    destinataire: str
    sujet: str
    corps: str

@app.post("/send-email")
async def send_email_api(req: EmailRequest):
    # --- CONFIGURATION SMTP (A MODIFIER AVEC TES INFOS) ---
    # Pour Gmail : utiliser un "Mot de passe d'application"
    SMTP_SERVER = "smtp.gmail.com" 
    SMTP_PORT = 587
    SENDER_EMAIL = os.getenv("EMAIL_USER")
    SENDER_PASSWORD = os.getenv("EMAIL_PASS")


    try:
        msg = MIMEMultipart()
        msg['From'] = SENDER_EMAIL
        msg['To'] = req.destinataire
        msg['Subject'] = req.sujet

        # On attache le corps en HTML
        msg.attach(MIMEText(req.corps, 'html'))

        # Connexion sécurisée
        server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        text = msg.as_string()
        server.sendmail(SENDER_EMAIL, req.destinataire, text)
        server.quit()
        
        return {"success": True, "message": "Email envoyé avec succès !"}

    except Exception as e:
        print(f"Erreur envoi mail: {e}")
        return {"success": False, "message": f"Erreur technique : {str(e)}"}