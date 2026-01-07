from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from database import supabase
from ml_engine import AuditEngine

app = FastAPI(title="ML-AUDIT PRO API v4.0")

# Configuration CORS pour React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "API ML-AUDIT PRO opérationnelle v4.0"}

# --- ROUTE 1 : CRÉATION DE MISSION (CALCUL ISA 320) ---
@app.post("/missions")
async def create_mission(mission_data: dict):
    try:
        ca = float(mission_data.get('chiffre_affaires_n', 0))
        res_net = float(mission_data.get('resultat_net_n', 0))
        total_b = float(mission_data.get('total_bilan', 0))

        # Calcul des seuils selon la norme v4.0
        # Seuil de signification = 1% du CA (par défaut)
        s_signif = ca * 0.01 if ca > 0 else 1000
        
        new_mission = {
            "raison_sociale": mission_data.get('raison_sociale'),
            "chiffre_affaires_n": ca,
            "resultat_net_n": res_net,
            "total_bilan": total_b,
            "seuil_signification": s_signif,
            "seuil_planification": s_signif * 0.75,
            "seuil_remontee": s_signif * 0.05,
            "statut": "Initialisée",
            "client_email": mission_data.get('client_email')
        }

        response = supabase.table("missions").insert(new_mission).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur création : {str(e)}")

# --- ROUTE 2 : RÉCUPÉRER TOUTES LES MISSIONS (POUR L'ADMIN) ---
@app.get("/missions")
async def get_missions():
    try:
        response = supabase.table("missions").select("*").order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 3 : ANALYSER UN FICHIER (FEC OU EXCEL) ---
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        engine = AuditEngine(mission_id)
        
        # CAS A : Fichier FEC (CSV ou TXT)
        if file.filename.lower().endswith(('.csv', '.txt')):
            # Lecture robuste (détection séparateur et encodage pro)
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', encoding='latin-1', dtype=str)
            
            # Nettoyage des colonnes
            df.columns = [c.lower().strip() for c in df.columns]
            
            if 'debit' in df.columns:
                df['debit'] = df['debit'].str.replace(r'\s+', '', regex=True).str.replace(',', '.')
                df['debit'] = pd.to_numeric(df['debit'], errors='coerce').fillna(0)
            else:
                raise HTTPException(status_code=400, detail="Colonne 'debit' manquante dans le FEC")

            # Lancement des 21 cycles d'analyse IA
            anomalies = engine.executer_analyse_v4(df)
            
            if anomalies:
                for a in anomalies:
                    a['mission_id'] = mission_id
                supabase.table("anomalies").insert(anomalies).execute()
            
            # Mise à jour statut
            supabase.table("missions").update({"statut": "Analyse Terminée"}).eq("id", mission_id).execute()
            
            return {"message": f"Analyse réussie : {len(anomalies)} anomalies détectées", "anomalies_detectees": len(anomalies)}

        # CAS B : Fichier EXCEL (Multi-feuilles)
        elif file.filename.lower().endswith(('.xlsx', '.xls')):
            result = engine.lire_dossier_excel(io.BytesIO(contents))
            return {"message": result}

        else:
            raise HTTPException(status_code=400, detail="Format de fichier non supporté")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse IA : {str(e)}")

# --- ROUTE 4 : RÉCUPÉRER LES ANOMALIES ---
@app.get("/anomalies/{mission_id}")
async def get_anomalies(mission_id: str):
    try:
        response = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 5 : RECOMMANDATION D'OPINION ---
@app.get("/opinion/{mission_id}")
async def get_opinion(mission_id: str):
    try:
        anomalies_res = supabase.table("anomalies").select("montant").eq("mission_id", mission_id).execute()
        mission_res = supabase.table("missions").select("seuil_signification").eq("id", mission_id).single().execute()
        
        total_impact = sum(float(a['montant']) for a in anomalies_res.data if a['montant'])
        seuil = float(mission_res.data['seuil_signification'])

        if total_impact > seuil:
            return {"opinion": "CERTIFICATION AVEC RÉSERVES", "motif": f"Impact financier ({total_impact}€) > Seuil ({seuil}€)"}
        else:
            return {"opinion": "CERTIFICATION SANS RÉSERVE", "motif": "Anomalies non significatives."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))