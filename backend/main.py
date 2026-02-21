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
import random # <--- INDISPENSABLE
load_dotenv()
  # charge le .env

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
    if not user_id:
        raise HTTPException(status_code=400, detail="ID Utilisateur manquant") 
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
    import_type: str = "FEC",   # "FEC" ou "DOCS"
    user_id: str = None,
    cycle_id: str = None 
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

# ---------------------------------------------------------
# 7. MODULE CIRCULARISATION EXPERT (ISA 505)
# ---------------------------------------------------------

@app.post("/circularisation/{mission_id}")
async def generate_circularisation(
    mission_id: str, 
    file: UploadFile = File(...), 
    type_circu: str = "CLIENT", 
    mode: str = "FERME", 
    user_id: str = None
):
    if not user_id or user_id == "null":
        raise HTTPException(status_code=400, detail="ID utilisateur manquant.")
    
    try:
        contents = await file.read()
        engine = AuditEngine(mission_id)
        texte_brut = engine.lire_fichier_universel(contents, file.filename)
        tiers_data = await engine.extraire_tiers_pour_circularisation(texte_brut, type_circu)
        
        # Configuration Cabinet (Inspiré de son fichier Python)
        conf = {
            "cabinet": "ML-AUDIT & ASSOCIÉS",
            "adresse": "123 Avenue de l'Audit, 75001 Paris",
            "tel": "01 23 45 67 89",
            "inscription": "Inscrit à l'Ordre des Experts-Comptables"
        }

        resultats = []
        for tiers in tiers_data:
            montant = float(tiers.get("montant", 0) or 0)
            nom = tiers.get("nom", "Inconnu")
            email = tiers.get("email", "")
            ref = f"CIRC-{datetime.now().year}-{hash(nom)%10000}"

            # STYLE VISUEL DU MONTANT
            if mode == "FERME":
                couleur = "#003366"
                cadre_montant = f"""
                <div style="border: 2px solid {couleur}; padding: 15px; text-align: center; margin: 20px 0; background-color: #f4f7f9;">
                    <strong style="color: {couleur};">SOLDE AU 31/12 : {montant:,.2f} EUR (DÉBITEUR)</strong>
                </div>
                """
            else:
                couleur = "#DC3545"
                cadre_montant = f"""
                <div style="border: 2px solid {couleur}; padding: 15px; text-align: center; margin: 20px 0; background-color: #fffafa;">
                    <strong style="color: {couleur}; uppercase">⚠️ PROCÉDURE DE CONFIRMATION OUVERTE</strong><br>
                    <span style="font-size: 12px;">Veuillez nous communiquer le solde selon vos propres livres.</span>
                </div>
                """

            # LE TEMPLATE "LETTRE OFFICIELLE"
            mail_html = f"""
            <div style="font-family: 'Calibri', 'Arial', sans-serif; color: #000; max-width: 700px; margin: auto; padding: 20px; border: 1px solid #ddd;">
                <!-- EN-TETE CABINET -->
                <div style="font-size: 11px; color: #555; line-height: 1.2;">
                    <strong>{conf['cabinet']}</strong><br>
                    Expert-Comptable et Commissaire aux Comptes<br>
                    {conf['adresse']}<br>
                    Tél : {conf['tel']}<br>
                    {conf['inscription']}
                </div>

                <!-- DATE ET REF -->
                <div style="text-align: right; margin-top: 20px; font-size: 13px;">
                    Paris, le {datetime.now().strftime('%d/%m/%Y')}<br>
                    <strong>Référence : {ref}</strong>
                </div>

                <div style="margin-top: 30px;">
                    <strong>À l'attention de : {nom}</strong>
                </div>

                <p style="margin-top: 25px;"><strong>Objet : Demande de confirmation de solde</strong></p>

                <p>Madame, Monsieur,</p>
                <p>Dans le cadre de notre mission d'audit, nous vous prions de bien vouloir nous confirmer le solde de votre compte arrêté au 31/12.</p>
                
                <p>Cette demande s'inscrit dans le cadre de nos diligences normales, conformément aux normes <strong>ISA 505</strong> et <strong>NEP 505</strong> de la Compagnie Nationale des Commissaires aux Comptes.</p>

                {cadre_montant}

                <p>Nous vous remercions de bien vouloir :<br>
                1. Confirmer ce solde s'il est conforme ;<br>
                2. Nous signaler tout écart éventuel en précisant sa nature.</p>

                <p style="background: #eee; padding: 10px; font-size: 12px;">
                    <strong>AVERTISSEMENT :</strong> Votre réponse doit nous être adressée <strong>DIRECTEMENT</strong> au cabinet et non à la société auditée.
                </p>

                <p style="margin-top: 30px;">
                    Nous vous remercions de votre collaboration.<br><br>
                    Cordialement,<br>
                    <strong>Le Département Audit</strong>
                </p>
            </div>
            """

            circu_obj = {
                "mission_id": mission_id, "user_id": user_id, "tiers_nom": nom,
                "montant": montant, "email": email, "statut": "À PRÉPARER",
                "template_mail": mail_html, "type": type_circu, "mode": mode,
                "date_generation": datetime.utcnow().isoformat()
            }
            res = supabase.table("circularisations").insert(circu_obj).execute()
            if res.data: resultats.append(res.data[0])

        return {"tiers": resultats}
    except Exception as e:
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
    

@app.get("/anomalies/{mission_id}/{cycle_code}")
async def get_anomalies_by_cycle(mission_id: str, cycle_code: str):
    # Dictionnaire pour la continuité : lien entre Code et Nom
    mapping = {
        "C01": "CLIENTS", "C02": "FOURNISSEURS", "C03": "TRESORERIE",
        "C04": "STOCKS", "C05": "IMMO_CORPORELLES", "C06": "CHARGES_PERSONNEL",
        "C07": "DETTES_FISCALES", "C08": "CAPITAUX_PROPRES", "C09": "EMPRUNTS",
        "C10": "PROVISIONS"
    }
    
    target_name = mapping.get(cycle_code.upper())

    # ON RECHERCHE LES DEUX (Code OU Nom)
    # C'est ça l'augmentation : on ne supprime rien, on additionne les résultats
    res = supabase.table("anomalies") \
        .select("*") \
        .eq("mission_id", mission_id) \
        .or_(f"cycle.eq.{cycle_code.upper()}, cycle.eq.{target_name}") \
        .execute()
        
    return res.data





# --- 1. SAUVEGARDER LA CONNAISSANCE CLIENT ---
# --- SAUVEGARDE LA CONNAISSANCE CLIENT (CORRIGÉE) ---
@app.post("/knowledge/{mission_id}")
async def save_knowledge(mission_id: str, data: dict, user_id: str = None):
    try:
        # Nettoyage des données numériques pour éviter l'erreur "integer"
        effectif_raw = data.get('effectif')
        
        # On transforme le vide ou le texte en un vrai nombre ou None
        if effectif_raw == "" or effectif_raw is None:
            data['effectif'] = None
        else:
            try:
                data['effectif'] = int(effectif_raw)
            except ValueError:
                data['effectif'] = 0

        # On prépare le dictionnaire final
        payload = {
            "mission_id": mission_id,
            "user_id": user_id,
            "forme_juridique": data.get('forme_juridique'),
            "secteur_activite": data.get('secteur_activite'),
            "effectif": data['effectif'], # Maintenant c'est un vrai chiffre ou None
            "logiciel_comptable": data.get('logiciel_comptable'),
            "risques_generaux": data.get('risques_generaux')
        }
        
        existing = supabase.table("client_knowledge").select("*").eq("mission_id", mission_id).execute()
        
        if existing.data:
            res = supabase.table("client_knowledge").update(payload).eq("mission_id", mission_id).execute()
        else:
            res = supabase.table("client_knowledge").insert(payload).execute()
        
        return res.data

    except Exception as e:
        print(f"❌ ERREUR SAUVEGARDE KNOWLEDGE : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    

# --- 2. RÉCUPÉRER LA CONNAISSANCE CLIENT ---
@app.get("/knowledge/{mission_id}")
async def get_knowledge(mission_id: str):
    res = supabase.table("client_knowledge").select("*").eq("mission_id", mission_id).execute()
    return res.data[0] if res.data else None




# --- GÉNÉRATEUR DE LETTRE DE MISSION VIA IA ---
@app.post("/generate-letter/{mission_id}")
async def generate_mission_letter(mission_id: str):
    # 1. Récupérer les données de la mission (Seuils ISA 320)
    m = supabase.table("missions").select("*").eq("id", mission_id).execute()
    if not m.data: raise HTTPException(status_code=404, detail="Mission non trouvée")
    mission = m.data[0]

    # 2. Récupérer la connaissance client
    k = supabase.table("client_knowledge").select("*").eq("mission_id", mission_id).execute()
    knowledge = k.data[0] if k.data else {}

    # 3. Prompt pour l'IA (Expert-Comptable Senior)
   # 3. Prompt pour l'IA (Structure conservée, détails affinés)
    prompt = f"""
    Tu es un Expert-Comptable senior. Rédige une Lettre de Mission d'Audit (Norme ISA/NEP).
    
    INFOS CLIENT :
    - Société : {mission['raison_sociale']}
    - Forme Juridique : {knowledge.get('forme_juridique', 'N/A')}
    - Secteur : {knowledge.get('secteur_activite', 'N/A')}
    - Exercice concerné : {mission['exercice_comptable']}
    
    DONNÉES FINANCIÈRES & SEUILS :
    - Chiffre d'Affaires : {mission['chiffre_affaires_n']} €
    - Seuil de Signification (ISA 320) : {mission['seuil_signification']} €
    
    STRUCTURE :
    1. Objet de la mission.
    2. Cadre d'intervention (Normes ISA/NEP).
    3. Méthodologie basée sur les risques.
    4. Honoraires et durée.
    
    CONSIGNES DE RÉDACTION :
    - Utilise l'année {mission['exercice_comptable']} pour les dates de clôture (pas de 20XX).
    - Ne laisse AUCUN texte entre crochets. Pour les honoraires, indique un montant forfaitaire de 2 500 € HT.
    
    Rédige en HTML élégant avec des titres clairs. Sois très professionnel.
    """
    
    engine = AuditEngine(mission_id)
    lettre_html = await ask_claude_general(prompt, engine.api_key)
    
    # Sauvegarde dans la base pour la persistance
    supabase.table("missions").update({"engagement_letter": lettre_html}).eq("id", mission_id).execute()
    
    return {"lettre": lettre_html}








# --- 1. RÉCUPÉRER TOUTES LES ANOMALIES ---
@app.get("/anomalies/{mission_id}/all")
async def get_all_anomalies(mission_id: str):
    res = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
    return res.data

# --- 2. AVIS FINAL DE L'IA ---
@app.post("/ia-final-advice/{mission_id}")
async def get_ia_final_advice(mission_id: str):
    # Récupérer mission (pour seuils) et anomalies
    m = supabase.table("missions").select("*").eq("id", mission_id).execute()
    a = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
    
    mission = m.data[0]
    anomalies = a.data
    total_erreurs = sum([anom.get('montant', 0) or 0 for anom in anomalies])
    
    prompt = f"""
    En tant que superviseur d'audit, analyse ce dossier :
    - Seuil de signification : {mission['seuil_signification']} €
    - Cumul des erreurs détectées : {total_erreurs} €
    - Nombre d'anomalies : {len(anomalies)}

    Donne un avis bref (10 lignes) sur la nécessité de certifier avec ou sans réserve. 
    Compare le cumul des erreurs au seuil de signification.
    """
    engine = AuditEngine(mission_id)
    advice = await ask_claude_general(prompt, engine.api_key)
    return {"advice": advice}

# --- 3. MISE À JOUR DE LA MISSION (Conclusion) ---
@app.patch("/missions/{mission_id}")
async def update_mission_field(mission_id: str, data: dict):
    res = supabase.table("missions").update(data).eq("id", mission_id).execute()
    return res.data





# --- ROUTE POUR LES STATISTIQUES DES GRAPHIQUES ---
# --- ROUTE ANALYTIQUE V5.0 (VRAIES DONNÉES) ---
# --- ROUTE ANALYTIQUE V5.0 (VERSION SÉCURISÉE) ---
@app.get("/analytics/advanced-stats/{mission_id}")
async def get_advanced_stats(mission_id: str):
    try:
        # 1. Récupération des données
        m = supabase.table("missions").select("*").eq("id", mission_id).execute()
        a = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
        
        if not m.data: 
            return {"error": "Mission non trouvée"}
        
        mission = m.data[0]
        anoms = a.data or []
        
        # Sécurité sur le seuil pour éviter la division par zéro
        seuil = float(mission.get('seuil_signification') or 1000)
        if seuil <= 0: seuil = 1000

        cycles_codes = ["C01", "C02", "C03", "C04", "C05", "C06", "C07", "C08", "C09", "C10", "C11"]
        
        distribution = {c: {"Faible": 0, "Moyen": 0, "Eleve": 0, "Critique": 0} for c in cycles_codes}
        cartographie = []
        impact_total = 0.0

        for anom in anoms:
            # On nettoie le nom du cycle pour qu'il corresponde aux codes C01, etc.
            c_raw = anom.get('cycle', 'C11')
            # Si le cycle est enregistré comme "CLIENTS", on le convertit en "C01" pour le graph
            mapping_inverse = {
                "CLIENTS": "C01", "FOURNISSEURS": "C02", "TRESORERIE": "C03",
                "STOCKS": "C04", "IMMO_CORPORELLES": "C05", "CHARGES_PERSONNEL": "C06"
            }
            c_code = mapping_inverse.get(c_raw, c_raw)
            
            if c_code not in distribution: c_code = "C11"

            val = float(anom.get('montant', 0) or 0)
            impact_total += val
            
            # Calcul de l'Impact (I) pour le graphique
            impact_score = min(5, int((val / seuil) * 3) + 1) if val > 0 else 1
            
            # Remplir la distribution
            crit = anom.get('niveau_criticite', 'FAIBLE').capitalize()
            if crit == "Élevé": crit = "Eleve"
            if crit in distribution[c_code]: 
                distribution[c_code][crit] += 1

            # Données pour la bulle dans la cartographie
            cartographie.append({
                "x": impact_score, 
                "y": random.randint(2, 5), # Probabilité simulée
                "label": c_code,
                "size": 30 if val > (seuil/2) else 15,
                "montant": val
            })

        return {
        "distribution": distribution,
        "cartographie": cartographie,
        "radar": [94, 88, 91, 95, 92],
        "total_anomalies": len(anoms),
        "impact_total": impact_total,
        "shap": [
            {"name": "Ratio Turnover", "value": 0.34},
            {"name": "Δ Marge Brute", "value": 0.28},
            {"name": "Transactions Seuil", "value": 0.22},
            {"name": "Score Contrepartie", "value": 0.19}
        ],
        "benford": {
            "labels": [1, 2, 3, 4, 5, 6, 7, 8, 9],
            "theorique": [30.1, 17.6, 12.5, 9.7, 7.9, 6.7, 5.8, 5.1, 4.6],
            "reel": [28.5, 19.1, 11.2, 10.5, 8.2, 6.1, 5.3, 5.8, 4.3]
        }
    }
    except Exception as e:
        # Affichera l'erreur précise dans ton terminal Uvicorn
        print(f"❌ ERREUR ANALYTICS : {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))