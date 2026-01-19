from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from ml_engine import AuditEngine
import pandas as pd
import io

# 1. Initialisation de l'application
app = FastAPI()

# 2. Configuration CORS (Pour que le Frontend React puisse parler au Backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Autorise toutes les origines (pour le dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Route pour créer une mission
@app.post("/missions")
async def create_mission_v4(data: dict):
    # Calcul des seuils selon la norme ISA 320
    ca = float(data.get('chiffre_affaires_n', 0))
    res_net = float(data.get('resultat_net_n', 0))
    bilan = float(data.get('total_bilan', 0))

    # Logique ISA : Max entre 1% CA, 5% Résultat, 0.5% Bilan
    s_signif = max(ca * 0.01, res_net * 0.05, bilan * 0.005)
    if s_signif == 0: s_signif = 1000 # Minimum technique

    mission_v4 = {
        "raison_sociale": data.get('raison_sociale'),
        "chiffre_affaires_n": ca,
        "resultat_net_n": res_net,
        "total_bilan": bilan,
        "seuil_signification": round(s_signif, 2),
        "seuil_planification": round(s_signif * 0.75, 2),
        "seuil_remontee": round(s_signif * 0.05, 2),
        "client_email": data.get('client_email'),
        "statut": "Initialisée"
    }

    res = supabase.table("missions").insert(mission_v4).execute()
    return res.data

# 4. Route pour analyser le fichier FEC (Celle qui utilise l'IA)
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, file: UploadFile = File(...)):
    contents = await file.read()
    
    # Détection plus robuste du format FEC (TXT souvent Tabulé ou Pipe)
    try:
        # On essaie d'abord avec tabulation (format standard FEC)
        # dtype=str pour éviter les problèmes de conversion automatique au chargement
        df = pd.read_csv(io.BytesIO(contents), sep='\t', encoding='latin1', dtype=str)
        
        # Si ça n'a qu'une colonne, on essaie avec Point-virgule
        if df.shape[1] < 2:
             df = pd.read_csv(io.BytesIO(contents), sep=';', encoding='latin1', dtype=str)
        # Si toujours une seule colonne, on essaie avec Pipe (|)
        if df.shape[1] < 2:
             df = pd.read_csv(io.BytesIO(contents), sep='|', encoding='latin1', dtype=str)
             
    except Exception as e:
        raise HTTPException(status_code=400, detail="Impossible de lire le fichier FEC. Vérifiez le format.")

    # Nettoyage des noms de colonnes (suppression espaces et minuscules)
    df.columns = [c.strip().lower() for c in df.columns]

    # Initialisation du moteur d'audit
    engine = AuditEngine(mission_id)
    
    # Lancement de l'analyse (Python + Claude AI)
    anomalies = engine.executer_analyse_v4(df)

    # Sauvegarde des résultats
    if anomalies:
        for a in anomalies: 
            a['mission_id'] = mission_id
        
        # Insertion dans Supabase
        supabase.table("anomalies").insert(anomalies).execute()
        
        # Mise à jour du statut de la mission
        supabase.table("missions").update({"statut": "Analysée"}).eq("id", mission_id).execute()

    return {"anomalies_detectees": len(anomalies)}