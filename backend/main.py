from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from ml_engine import AuditEngine
import pandas as pd
import io

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

# 3. Route pour créer une mission (Mise à jour avec Exercice et Download Count)
@app.post("/missions")
async def create_mission_v4(data: dict):
    ca = float(data.get('chiffre_affaires_n', 0))
    res_net = float(data.get('resultat_net_n', 0))
    bilan = float(data.get('total_bilan', 0))

    # Calcul des seuils ISA 320
    s_signif = max(ca * 0.01, res_net * 0.05, bilan * 0.005)
    if s_signif == 0: s_signif = 1000

    mission_v4 = {
        "raison_sociale": data.get('raison_sociale'),
        "exercice_comptable": data.get('exercice_comptable', '2024'), # Ajout de l'année
        "chiffre_affaires_n": ca,
        "resultat_net_n": res_net,
        "total_bilan": bilan,
        "seuil_signification": round(s_signif, 2),
        "seuil_planification": round(s_signif * 0.75, 2),
        "seuil_remontee": round(s_signif * 0.05, 2),
        "client_email": data.get('client_email'),
        "statut": "Initialisée",
        "download_count": 0  # Initialisation du compteur
    }

    res = supabase.table("missions").insert(mission_v4).execute()
    return res.data

# 4. Route pour analyser le fichier FEC (Version ROBUSTE + MAPPING)
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, file: UploadFile = File(...)):
    contents = await file.read()
    df = None

    # Liste des séparateurs et encodages à tester
    separators = ['\t', ';', '|', ',']
    encodings = ['utf-8', 'latin1', 'cp1252']

    # Tentative de lecture robuste (Test de toutes les combinaisons)
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
                    print(f"✅ Fichier lu avec succès : {encoding} / '{sep}'")
                    break
            except Exception:
                continue
        if df is not None:
            break

    if df is None or df.empty or df.shape[1] < 2:
        raise HTTPException(status_code=400, detail="Impossible de lire le fichier (Format inconnu). Vérifiez qu'il s'agit d'un CSV ou TXT valide.")

    # --- CORRECTION CRUCIALE DES NOMS DE COLONNES ---
    # 1. On met tout en minuscule et on enlève les espaces
    df.columns = [c.strip().lower() for c in df.columns]

    # 2. Dictionnaire de mappage pour forcer les bons noms
    column_mapping = {
        'journalcode': 'journal_code', 'codejournal': 'journal_code', 'journal': 'journal_code', 'jnl': 'journal_code',
        'ecriturenum': 'ecriture_num', 'numecriture': 'ecriture_num',
        'ecrituredate': 'ecriture_date', 'dateecriture': 'ecriture_date', 'date': 'ecriture_date',
        'comptenum': 'compte_num', 'numcompte': 'compte_num', 'compte': 'compte_num',
        'ecriturelib': 'ecriture_lib', 'libelleecriture': 'ecriture_lib', 'libelle': 'ecriture_lib', 'lib': 'ecriture_lib',
        'debit': 'debit', 'credit': 'credit'
    }

    # On applique le renommage
    df.rename(columns=column_mapping, inplace=True)

    # 3. Vérification ultime : si une colonne manque, on la crée vide pour éviter le crash
    required_columns = ['journal_code', 'ecriture_date', 'compte_num', 'ecriture_lib', 'debit', 'credit']
    for col in required_columns:
        if col not in df.columns:
            print(f"⚠️ Colonne manquante : {col} -> Création d'une colonne vide.")
            df[col] = '' if col not in ['debit', 'credit'] else 0

    # Initialisation du moteur d'audit
    engine = AuditEngine(mission_id)
    
    try:
        # Lancement de l'analyse
        anomalies = engine.executer_analyse_v4(df)
        
        if anomalies:
            for a in anomalies: 
                a['mission_id'] = mission_id
            
            # Sauvegarde dans Supabase
            supabase.table("anomalies").insert(anomalies).execute()
            # Mise à jour du statut
            supabase.table("missions").update({"statut": "Analysée"}).eq("id", mission_id).execute()

        return {"anomalies_detectees": len(anomalies)}

    except Exception as e:
        print(f"ERREUR MOTEUR : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur interne lors de l'analyse : {str(e)}")

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