import pandas as pd
import numpy as np
import os
import json
import anthropic
from datetime import datetime
import fitz  # PyMuPDF
import openpyxl
from io import BytesIO

class AuditEngine:
    def __init__(self, mission_id):
        self.mission_id = mission_id
        # On récupère la clé API une seule fois
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        
        if self.api_key:
            self.claude_client = anthropic.Anthropic(api_key=self.api_key)
        else:
            self.claude_client = None
            print("⚠️ ATTENTION: Clé API Anthropic manquante !")

    # --- LECTURE FICHIERS ---
    def lire_fichier_universel(self, contents, filename):
        try:
            if filename.endswith('.pdf'):
                doc = fitz.open(stream=contents, filetype="pdf")
                texte = ""
                for page in doc:
                    texte += page.get_text() + "\n"
                return texte

            elif filename.endswith('.xlsx') or filename.endswith('.xls'):
                wb = openpyxl.load_workbook(filename=BytesIO(contents), data_only=True)
                texte = ""
                for sheet in wb.sheetnames:
                    ws = wb[sheet]
                    for row in ws.iter_rows(values_only=True):
                        line = " ".join([str(c) for c in row if c is not None])
                        texte += line + "\n"
                return texte
            else:
                return contents.decode("utf-8", errors="ignore")
        except Exception as e:
            return f"ERREUR LECTURE: {str(e)}"

    def _determiner_cycle(self, compte_num):
        c = str(compte_num).strip()
        if c.startswith(('10', '11', '12')): return "CAPITAUX_PROPRES"
        if c.startswith('15'): return "PROVISIONS"
        if c.startswith('16'): return "EMPRUNTS"
        if c.startswith('2'): return "IMMO_CORPORELLES"
        if c.startswith('3'): return "STOCKS"
        if c.startswith('40'): return "FOURNISSEURS"
        if c.startswith('41'): return "CLIENTS"
        if c.startswith(('42', '43')): return "DETTES_SOCIALES"
        if c.startswith('44'): return "DETTES_FISCALES"
        if c.startswith('5'): return "TRESORERIE"
        if c.startswith(('6')): return "CHARGES"
        if c.startswith(('7')): return "PRODUITS"
        return "OPERATIONS_DIVERSES"

    # --- ANALYSE PRINCIPALE ---
    def executer_analyse_v4(self, df):
        anomalies = []
        # Nettoyage
        for col in ['debit', 'credit']:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        if 'compte_num' in df.columns:
            df['cycle_calcule'] = df['compte_num'].apply(self._determiner_cycle)
        else:
            df['cycle_calcule'] = "INCONNU"

        # Règles Python
        try:
            anomalies.extend(self._analyse_benford(df))
            anomalies.extend(self._analyse_tracfin(df))
            anomalies.extend(self._analyse_comptes_sensibles(df))
        except Exception as e:
            print(f"Erreur Python: {e}")

        # Analyse IA sur échantillon
        try:
            df['is_round'] = (df['debit'] % 100 == 0) & (df['debit'] > 1000)
            risky = df[df['is_round'] | (df['journal_code'] == 'OD')].sort_values(by='debit', ascending=False).head(20)
            
            if self.claude_client:
                cols = [c for c in ['journal_code', 'ecriture_date', 'compte_num', 'ecriture_lib', 'debit', 'credit'] if c in risky.columns]
                data_json = risky[cols].to_json(orient="records")
                ai_anomalies = self._ask_claude_json(data_json)
                anomalies.extend(ai_anomalies)
        except Exception as e:
            print(f"Erreur IA Analyse: {e}")

        return anomalies

    # --- FONCTIONS IA ---

    def _ask_claude_json(self, json_data):
        """Pour l'analyse (retourne du JSON)"""
        prompt = f"""
        Analyse ces écritures comptables (JSON). Cherche fraudes, erreurs, incohérences.
        DONNÉES: {json_data}
        Réponds UNIQUEMENT en JSON formaté ainsi : 
        [{{ "cycle": "...", "type_anomalie": "...", "niveau_criticite": "CRITIQUE", "score_ml": 90, "montant": 0, "description": "..." }}]
        Si rien, renvoie [].
        """
        try:
            msg = self.claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=2000,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            txt = msg.content[0].text
            return json.loads(txt[txt.find('['):txt.rfind(']')+1])
        except: return []

    def analyser_document_pdf_excel(self, texte):
        """Pour les docs PDF/Excel (retourne du JSON)"""
        prompt = f"""
        Tu es auditeur. Analyse ce document brut. Cherche des anomalies (dates, montants, IBAN).
        DOCUMENT: {texte[:10000]}
        Réponds UNIQUEMENT en JSON formaté comme une anomalie d'audit.
        """
        try:
            msg = self.claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=1500,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            txt = msg.content[0].text
            return json.loads(txt[txt.find('['):txt.rfind(']')+1])
        except: return []

    # --- LE CHATBOT (Intégré ici pour utiliser la connexion existante) ---
    def ask_audit_assistant(self, question, context_str):
        """Répond aux questions de l'utilisateur"""
        if not self.claude_client:
            return "Désolé, je n'ai pas de clé API active."

        prompt = f"""
        Tu es un Assistant Expert-Comptable.
        Voici le contexte du dossier (anomalies détectées) :
        {context_str}

        QUESTION UTILISATEUR : "{question}"

        Réponds poliment, professionnellement et brièvement. Si la question est "Bonjour", réponds simplement bonjour.
        """
        try:
            msg = self.claude_client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=800,
                temperature=0.7,
                messages=[{"role": "user", "content": prompt}]
            )
            return msg.content[0].text
        except Exception as e:
            return f"Erreur IA Chat: {str(e)}"

    # --- RÈGLES STATISTIQUES ---
    def _analyse_benford(self, df):
        return [] # (Garde ton code Benford ici si tu veux, j'abrège pour la copie)

    def _analyse_tracfin(self, df):
        treso = df[df['compte_num'].astype(str).str.startswith('5')]
        smurfing = treso[(treso['debit'] >= 9000) & (treso['debit'] < 10000)]
        if len(smurfing) > 0:
            return [{
                "cycle": "TRESORERIE", "type_anomalie": "TRACFIN", "niveau_criticite": "CRITIQUE",
                "score_ml": 99, "montant": float(smurfing['debit'].sum()),
                "description": f"ALERTE : {len(smurfing)} mouvements entre 9k€ et 10k€ (soupçon fractionnement)."
            }]
        return []

    def _analyse_comptes_sensibles(self, df):
        return []