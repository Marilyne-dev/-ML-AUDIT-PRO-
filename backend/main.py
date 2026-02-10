# --- IMPORTANT : CHARGER LES VARIABLES D'ENVIRONNEMENT EN PREMIER ---
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import supabase
from ml_engine import AuditEngine
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

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    question: str

# 1. CRÉATION MISSION
@app.post("/missions")
async def create_mission_v4(data: dict):
    ca = float(data.get('chiffre_affaires_n', 0))
    res_net = float(data.get('resultat_net_n', 0))
    bilan = float(data.get('total_bilan', 0))
    
    s_signif = max(ca * 0.01, res_net * 0.05, bilan * 0.005)
    if s_signif == 0: s_signif = 1000

    mission_v4 = {
        "raison_sociale": data.get('raison_sociale'),
        "exercice_comptable": data.get('exercice_comptable', '2025'),
        "exercice_n": int(data.get('exercice_comptable', 2025)),
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
        print(f"SQL Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. ANALYSE (MULTI-FICHIERS)
@app.post("/analyze/{mission_id}")
async def analyze_v4(mission_id: str, files: List[UploadFile] = File(...)):
    supabase.table("anomalies").delete().eq("mission_id", mission_id).execute()
    
    engine = AuditEngine(mission_id)
    total_anomalies = []

    for file in files:
        contents = await file.read()
        filename = file.filename.lower()
        file_anomalies = []

        if filename.endswith(('.pdf', '.xlsx', '.xls')):
            texte = engine.lire_fichier_universel(contents, filename)
            if "ERREUR" not in texte:
                file_anomalies = engine.analyser_document_pdf_excel(texte)
        else:
            # FEC
            df = None
            for enc in ['utf-8', 'latin1', 'cp1252']:
                for sep in ['\t', ';', '|', ',']:
                    try:
                        temp = pd.read_csv(io.BytesIO(contents), sep=sep, encoding=enc, dtype=str, on_bad_lines='skip')
                        if temp.shape[1] > 1: df = temp; break
                    except: continue
                if df is not None: break
            
            if df is not None:
                df.columns = [c.strip().lower() for c in df.columns]
                # Mapping simple
                mapping = {'journalcode':'journal_code', 'ecriturenum':'ecriture_num', 'ecrituredate':'ecriture_date', 
                           'comptenum':'compte_num', 'ecriturelib':'ecriture_lib', 'debit':'debit', 'credit':'credit'}
                df.rename(columns=mapping, inplace=True)
                file_anomalies = engine.executer_analyse_v4(df)

        for a in file_anomalies:
            a['mission_id'] = mission_id
            a['description'] = f"[{filename}] {a.get('description','')}"
            total_anomalies.append(a)

    if total_anomalies:
        batch_size = 50
        for i in range(0, len(total_anomalies), batch_size):
            supabase.table("anomalies").insert(total_anomalies[i:i+batch_size]).execute()
        supabase.table("missions").update({"statut": "Analysée"}).eq("id", mission_id).execute()

    return {"anomalies_detectees": len(total_anomalies)}

# 3. CHATBOT (CORRIGÉ)
@app.post("/chat/{mission_id}")
async def chat_audit(mission_id: str, req: QuestionRequest):
    question = req.question.lower().strip()
    
    # Récupérer les anomalies pour donner du contexte à l'IA
    response = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute()
    anomalies = response.data if response.data else []
    
    contexte_str = ""
    if anomalies:
        contexte_str = f"Il y a {len(anomalies)} anomalies :\n"
        for a in anomalies[:10]: # On limite à 10 pour ne pas saturer
            contexte_str += f"- {a.get('type_anomalie')}: {a.get('description')} ({a.get('montant')}€)\n"
    else:
        contexte_str = "Aucune anomalie détectée."

    # Appel au moteur (qui contient la méthode de chat)
    engine = AuditEngine(mission_id)
    reponse = engine.ask_audit_assistant(req.question, contexte_str)
    
    return {"reponse": reponse}

# 4. TRACKING
@app.post("/track-download/{mission_id}")
async def track_download(mission_id: str):
    try:
        cur = supabase.table("missions").select("download_count").eq("id", mission_id).execute()
        val = cur.data[0]['download_count'] if cur.data else 0
        supabase.table("missions").update({"download_count": val + 1}).eq("id", mission_id).execute()
        return {"success": True, "new_count": val + 1}
    except: return {"success": False}

# 5. EXPORT
@app.get("/export/{mission_id}")
async def export_report(mission_id: str, format: str = "pdf"):
    mission = supabase.table("missions").select("*").eq("id", mission_id).execute().data[0]
    anomalies = supabase.table("anomalies").select("*").eq("mission_id", mission_id).execute().data or []
    
    if format == "pdf":
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.drawString(100, 750, f"RAPPORT AUDIT - {mission['raison_sociale']}")
        y = 700
        for a in anomalies:
            p.drawString(50, y, f"- {a.get('type_anomalie')}: {a.get('description')[:80]}...")
            y -= 20
            if y < 50: p.showPage(); y = 750
        p.save()
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=Rapport.pdf"})
    
    elif format == "xlsx":
        buffer = io.BytesIO()
        pd.DataFrame(anomalies).to_excel(buffer, index=False)
        buffer.seek(0)
        return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=Rapport.xlsx"})
    
    else: # TXT
        content = f"RAPPORT {mission['raison_sociale']}\n"
        for a in anomalies: content += f"- {a.get('description')}\n"
        return StreamingResponse(io.BytesIO(content.encode()), media_type="text/plain", headers={"Content-Disposition": "attachment; filename=Rapport.txt"})