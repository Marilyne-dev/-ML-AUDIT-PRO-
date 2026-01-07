from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import io
from database import supabase
from ml_engine import AuditEngine

app = FastAPI(title="ML-AUDIT PRO API v4.0")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "API ML-AUDIT PRO opérationnelle v4.0"}

# --- ROUTE 1 : CRÉATION DE MISSION AVEC CALCULS ISA 320 ---
@app.post("/missions")
async def create_mission(mission_data: dict):
    try:
        ca = float(mission_data.get('chiffre_affaires_n', 0))
        resultat = float(mission_data.get('resultat_net_n', 0))
        total_bilan = float(mission_data.get('total_bilan', 0))

        # CALCUL LÉGAL ISA 320 (Seuils d'audit)
        seuils = [
            ca * 0.01,                           # 1% du CA
            resultat * 0.05 if resultat > 0 else 0, # 5% du résultat
            total_bilan * 0.005                  # 0.5% du total bilan
        ]
        seuil_signification = max(s for s in seuils if s > 0) if any(s > 0 for s in seuils) else 1000
        
        mission_data.update({
            "seuil_signification": seuil_signification,
            "seuil_planification": seuil_signification * 0.75,
            "seuil_remontee": seuil_signification * 0.05,
            "statut": "Initialisée"
        })

        response = supabase.table("missions").insert(mission_data).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 2 : RÉCUPÉRER TOUTES LES MISSIONS (ADMIN) ---
@app.post("/missions")
async def create_mission(mission_data: dict):
    try:
        # Calcul des seuils v4.0
        ca = float(mission_data.get('chiffre_affaires_n', 0))
        # ISA 320 : 1% du CA
        s_signif = ca * 0.01
        
        new_mission = {
            "raison_sociale": mission_data.get('raison_sociale'),
            "chiffre_affaires_n": ca,
            "resultat_net_n": float(mission_data.get('resultat_net_n', 0)),
            "total_bilan": float(mission_data.get('total_bilan', 0)),
            "seuil_signification": s_signif,
            "seuil_planification": s_signif * 0.75,
            "seuil_remontee": s_signif * 0.05,
            "statut": "Initialisée",
            "client_email": mission_data.get('client_email') # Pour savoir à qui c'est
        }

        response = supabase.table("missions").insert(new_mission).execute()
        return response.data
    except Exception as e:
        print(f"Erreur backend: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 3 : ANALYSER UN FICHIER (FEC ou EXCEL) ---
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, file: UploadFile = File(...)):
    try:
        contents = await file.read()
        engine = AuditEngine(mission_id)
        
        # Cas 1 : Fichier FEC (CSV ou TXT)
        if file.filename.endswith(('.csv', '.txt')):
            df = pd.read_csv(io.BytesIO(contents), sep=None, engine='python', dtype=str)
            df.columns = [c.lower() for c in df.columns]
            
            # Conversion numérique du débit
            if 'debit' in df.columns:
                df['debit'] = pd.to_numeric(df['debit'].str.replace(',', '.'), errors='coerce').fillna(0)
            
            # Lancement de l'IA (21 cycles)
            anomalies = engine.executer_analyse_v4(df)
            
            if anomalies:
                for a in anomalies:
                    a['mission_id'] = mission_id
                supabase.table("anomalies").insert(anomalies).execute()
            
            # Mise à jour du statut de la mission
            supabase.table("missions").update({"statut": "Analyse Terminée"}).eq("id", mission_id).execute()
            return {"message": "Audit IA 4.0 terminé", "anomalies_detectees": len(anomalies)}

        # Cas 2 : Dossier d'Audit Excel (146 feuilles)
        elif file.filename.endswith(('.xlsx', '.xls')):
            res = engine.lire_dossier_excel(io.BytesIO(contents))
            return {"message": res}

        else:
            raise HTTPException(status_code=400, detail="Format de fichier non supporté")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'analyse : {str(e)}")

# --- ROUTE 4 : RÉCUPÉRER LES ANOMALIES ---
@app.get("/anomalies/{mission_id}")
async def get_anomalies(mission_id: str):
    try:
        response = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ROUTE 5 : RECOMMANDATION D'OPINION (NEP 700) ---
@app.get("/opinion/{mission_id}")
async def get_opinion(mission_id: str):
    try:
        # Récupérer anomalies et seuil
        anomalies_res = supabase.table("anomalies").select("montant").eq("mission_id", mission_id).execute()
        mission_res = supabase.table("missions").select("seuil_signification").eq("id", mission_id).execute()
        
        if not mission_res.data:
            raise HTTPException(status_code=404, detail="Mission non trouvée")
            
        total_impact = sum(float(a['montant']) for a in anomalies_res.data if a['montant'])
        seuil = float(mission_res.data[0]['seuil_signification'])

        if total_impact > seuil:
            return {
                "opinion": "CERTIFICATION AVEC RÉSERVES",
                "motif": f"L'impact financier ({total_impact}€) dépasse le seuil de signification ({seuil}€)."
            }
        else:
            return {
                "opinion": "CERTIFICATION SANS RÉSERVE",
                "motif": "Les anomalies détectées sont inférieures au seuil de signification."
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))