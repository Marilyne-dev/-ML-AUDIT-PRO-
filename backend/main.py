from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from ml_engine import AuditEngine
from typing import List
import pandas as pd
import io
import xlsxwriter
from dotenv import load_dotenv
load_dotenv() # Charge les variables du fichier .env
import os
# 1. Initialisation de l'application
app = FastAPI()

# 2. Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Route pour créer une mission
@app.post("/missions")
async def create_mission_v4(data: dict):
    ca = float(data.get('chiffre_affaires_n', 0))
    res_net = float(data.get('resultat_net_n', 0))
    bilan = float(data.get('total_bilan', 0))

    # Calcul des seuils ISA 320
    s_signif = max(ca * 0.01, res_net * 0.05, bilan * 0.005)
    if s_signif == 0: s_signif = 1000

    # On récupère l'année en texte
    annee_txt = data.get('exercice_comptable', '2024')
    
    # On essaie de convertir en entier pour l'ancienne colonne
    try:
        annee_int = int(annee_txt)
    except:
        annee_int = 2024

    mission_v4 = {
        "raison_sociale": data.get('raison_sociale'),
        "exercice_comptable": annee_txt,
        "exercice_n": annee_int,  # CORRECTION ICI : On remplit l'ancienne colonne aussi
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

    # Insertion
    try:
        res = supabase.table("missions").insert(mission_v4).execute()
        return res.data
    except Exception as e:
        print(f"ERREUR SQL : {e}")
        raise HTTPException(status_code=500, detail=str(e))
    



# 4. Route pour analyser TOUS types de fichiers (FEC, Excel, PDF)
from typing import List # Ajoute cet import en haut si pas déjà là

# ... le reste du code ...

# 4. Route MULTI-FICHIERS (FEC, PDF, Excel)
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, files: List[UploadFile] = File(...)):
    
    # On nettoie les anciennes anomalies pour cette mission avant de commencer
    # (Sauf si tu veux garder l'historique, mais pour l'instant on remplace)
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
                # Si c'est un Excel qui ressemble à un FEC, on pourrait le traiter comme un FEC
                # Mais pour l'instant, on traite Excel comme un document à lire par l'IA
                texte_extrait = engine.lire_fichier_universel(contents, filename)
                
                if "ERREUR" in texte_extrait:
                    file_anomalies = [{
                        "cycle": "IMPORT", "type_anomalie": "ERREUR LECTURE",
                        "niveau_criticite": "FAIBLE", "score_ml": 0, "montant": 0,
                        "description": f"[{filename}] {texte_extrait}"
                    }]
                else:
                    file_anomalies = engine.analyser_document_pdf_excel(texte_extrait)

            except Exception as e:
                print(f"Erreur sur {filename}: {e}")

        # B. CAS FEC (.txt, .csv)
        else:
            df = None
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
                # Nettoyage
                df.columns = [c.strip().lower() for c in df.columns]
                mapping = {
                    'journalcode': 'journal_code', 'ecriturenum': 'ecriture_num',
                    'ecrituredate': 'ecriture_date', 'comptenum': 'compte_num',
                    'ecriturelib': 'ecriture_lib', 'debit': 'debit', 'credit': 'credit'
                }
                df.rename(columns=mapping, inplace=True)
                file_anomalies = engine.executer_analyse_v4(df)

        # C. MARQUAGE DES ANOMALIES AVEC LE NOM DU FICHIER
        # Pour savoir dans le rapport de quel fichier ça vient
        for anom in file_anomalies:
            anom['mission_id'] = mission_id
            # On ajoute le nom du fichier au début de la description
            anom['description'] = f"📄 [{file.filename}] {anom.get('description', '')}"
            total_anomalies.append(anom)

    # 3. SAUVEGARDE EN BASE (Une seule fois pour tout le lot)
    if total_anomalies:
        # On insère par paquets de 100 pour éviter de bloquer si y'en a trop
        batch_size = 100
        for i in range(0, len(total_anomalies), batch_size):
            batch = total_anomalies[i:i + batch_size]
            supabase.table("anomalies").insert(batch).execute()
            
        supabase.table("missions").update({"statut": "Analysée"}).eq("id", mission_id).execute()

    return {"anomalies_detectees": len(total_anomalies)}


# 5. Route pour compter les téléchargements (Traçabilité)
@app.post("/track-download/{mission_id}")
async def track_download(mission_id: str):
    try:
        # On récupère la mission actuelle pour avoir le compteur actuel
        response = supabase.table("missions").select("download_count").eq("id", mission_id).execute()
        
        current_count = 0
        if response.data and len(response.data) > 0:
            val = response.data[0]['download_count']
            if val is not None:
                current_count = val
        
        # On incrémente de 1
        new_count = current_count + 1
        
        # On met à jour
        supabase.table("missions").update({"download_count": new_count}).eq("id", mission_id).execute()
        
        return {"success": True, "new_count": new_count}
    except Exception as e:
        print(f"Erreur tracking: {e}")
        return {"success": False, "error": str(e)}
    

# 6. Route pour le Chatbot Audit
@app.post("/chat/{mission_id}")
async def chat_audit(mission_id: str, payload: dict):
    question = payload.get("question")

    try:
        # 1. Récupérer anomalies
        response = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
        anomalies = response.data if response.data else []

        # 2. Appeler IA
        engine = AuditEngine(mission_id)
        reponse_ia = engine.ask_audit_assistant(question, anomalies)

        # Sécurité si IA renvoie vide
        if not reponse_ia:
            return {"reponse": "⚠️ L'IA n'a pas répondu."}

        return {"reponse": reponse_ia}

    except Exception as e:
        print("ERREUR CHAT IA :", e)
        return {"reponse": "⚠️ Erreur interne de l'IA. Réessayez."}



