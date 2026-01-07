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
# Dans backend/main.py (Route createMission)
@app.post("/missions")
async def create_mission(mission_data: dict):
    ca = mission_data.get('chiffre_affaires_n', 0)
    resultat = mission_data.get('resultat_net_n', 0)
    total_bilan = mission_data.get('total_bilan', 0)

    # CALCUL LÉGAL ISA 320 (Basé sur ton code source v4.0)
    seuils = [
        ca * 0.01,           # 1% du CA
        resultat * 0.05 if resultat > 0 else 0, # 5% du résultat
        total_bilan * 0.005  # 0.5% du total bilan
    ]
    seuil_signification = max(s for s in seuils if s > 0)
    seuil_planification = seuil_signification * 0.75
    seuil_remontee = seuil_signification * 0.05

    # Insertion enrichie
    mission_data.update({
        "seuil_signification": seuil_signification,
        "seuil_planification": seuil_planification,
        "seuil_remontee": seuil_remontee
    })
    return supabase.table("missions").insert(mission_data).execute()

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
    
    # Dans backend/main.py
@app.get("/opinion/{mission_id}")
async def get_opinion(mission_id: str):
    # 1. On récupère les anomalies
    anomalies = supabase.table("anomalies").select("montant").eq("mission_id", mission_id).execute()
    mission = supabase.table("missions").select("seuil_signification").eq("id", mission_id).single().execute()
    
    total_impact = sum(a['montant'] for a in anomalies.data if a['montant'])
    seuil = mission.data['seuil_signification']

    if total_impact > seuil:
        return {"opinion": "CERTIFICATION AVEC RÉSERVES", "motif": "Impact financier supérieur au seuil."}
    else:
        return {"opinion": "CERTIFICATION SANS RÉSERVE", "motif": "Les anomalies sont immatérielles."}