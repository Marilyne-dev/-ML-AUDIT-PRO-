from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from database import supabase
from ml_engine import AuditEngine

app = FastAPI(title="ML-AUDIT PRO API")

# Configuration CORS pour que le Frontend React puisse parler au Backend Python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "API ML-AUDIT PRO opérationnelle v4.0"}

# --- ROUTE 1 : ANALYSER UN FICHIER (Pour le Client) ---
@app.post("/analyze/{mission_id}")
async def analyze_fec(mission_id: str, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', dtype=str)
        except Exception as e:
            raise HTTPException(status_code=400, detail="Format de fichier invalide. CSV ou TXT requis.")

        df.columns = [c.lower() for c in df.columns]

        cols_requises = ['debit', 'compte_num', 'ecriture_lib', 'ecriture_date']
        for col in cols_requises:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Colonne manquante : {col}")

        df['debit'] = pd.to_numeric(df['debit'].str.replace(',', '.'), errors='coerce').fillna(0)

        engine = AuditEngine(mission_id)
        anomalies = engine.executer_analyse_complete(df)

        if anomalies:
            for a in anomalies:
                a['mission_id'] = mission_id
            
            # Enregistrement dans Supabase
            supabase.table("anomalies").insert(anomalies).execute()
            
            # Mise à jour du statut
            supabase.table("missions").update({"statut": "Analyse terminée"}).eq("id", mission_id).execute()

        return {
            "status": "success",
            "message": f"{len(anomalies)} anomalies détectées.",
            "anomalies_count": len(anomalies)
        }
    except Exception as e:
        print(f"Erreur : {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 2 : RÉCUPÉRER LES MISSIONS (Pour l'Admin) ---
@app.get("/missions")
async def get_missions():
    """Récupère la liste de tous les clients auditables"""
    try:
        response = supabase.table("missions").select("*").execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 3 : RÉCUPÉRER LES ANOMALIES (Pour l'Admin) ---
@app.get("/anomalies/{mission_id}")
async def get_anomalies(mission_id: str):
    """Récupère les erreurs trouvées pour un client spécifique"""
    try:
        response = supabase.table("anomalies")\
            .select("*")\
            .eq("mission_id", mission_id)\
            .execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))