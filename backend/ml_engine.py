import pandas as pd
import numpy as np
import os
import json
import anthropic
from datetime import datetime
import fitz  
import openpyxl
from io import BytesIO

class AuditEngine:
    def __init__(self, mission_id):
        self.mission_id = mission_id
        # On s'assure que la clé est bien récupérée, sinon on met une valeur vide pour éviter le crash immédiat
        self.api_key = os.environ.get("ANTHROPIC_API_KEY")
        
        if self.api_key:
            self.claude_client = anthropic.Anthropic(api_key=self.api_key)
        else:
            self.claude_client = None
            print("⚠️ ATTENTION: Clé API Anthropic manquante !")


    def lire_fichier_universel(self, contents, filename):
        
        try:
            if filename.endswith('.pdf'):
                doc = fitz.open(stream=contents, filetype="pdf")
                texte = ""
                for page in doc:
                    texte += page.get_text()
                return texte

            elif filename.endswith('.xlsx') or filename.endswith('.xls'):
                wb = openpyxl.load_workbook(filename=BytesIO(contents), data_only=True)
                texte = ""
                for sheet in wb.sheetnames:
                    ws = wb[sheet]
                    for row in ws.iter_rows(values_only=True):
                        texte += " ".join([str(c) for c in row if c is not None]) + "\n"
                return texte

            else:
                # TXT ou CSV
                return contents.decode("utf-8", errors="ignore")

        except Exception as e:
            return f"ERREUR: {str(e)}"



    def _determiner_cycle(self, compte_num):
        """Assigne un des 21 cycles d'audit selon le numéro de compte"""
        c = str(compte_num).strip()
        
        if c.startswith('10') or c.startswith('11') or c.startswith('12'): return "CAPITAUX_PROPRES"
        if c.startswith('15'): return "PROVISIONS"
        if c.startswith('16'): return "EMPRUNTS"
        if c.startswith('2'): return "IMMO_CORPORELLES" 
        if c.startswith('3'): return "STOCKS"
        if c.startswith('40'): return "FOURNISSEURS"
        if c.startswith('41'): return "CLIENTS"
        if c.startswith('42') or c.startswith('43'): return "DETTES_SOCIALES"
        if c.startswith('44'): return "DETTES_FISCALES"
        if c.startswith('45') or c.startswith('46'): return "AUTRES_CREANCES_DETTES"
        if c.startswith('5'): return "TRESORERIE"
        if c.startswith('60') or c.startswith('61') or c.startswith('62'): return "CHARGES_EXPLOITATION"
        if c.startswith('64'): return "CHARGES_PERSONNEL"
        if c.startswith('66'): return "RESULTAT_FINANCIER"
        if c.startswith('69'): return "IMPOTS"
        if c.startswith('70'): return "PRODUITS_EXPLOITATION"
        
        return "OPERATIONS_DIVERSES"

    def executer_analyse_v4(self, df):
        anomalies = []
        
        # Nettoyage et conversion
        for col in ['debit', 'credit']:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # Ajout de la colonne Cycle pour chaque ligne
        if 'compte_num' in df.columns:
            df['cycle_calcule'] = df['compte_num'].apply(self._determiner_cycle)
        else:
            df['cycle_calcule'] = "INCONNU"

        # --- PHASE 1 : ANALYSE STATISTIQUE (PYTHON) ---
        try:
            anomalies.extend(self._analyse_benford(df))
            anomalies.extend(self._analyse_tracfin(df))
            anomalies.extend(self._analyse_comptes_sensibles(df))
        except Exception as e:
            print(f"Erreur analyse Python : {e}")
        
        # --- PHASE 2 : ANALYSE EXPERTE (CLAUDE AI) ---
        try:
            # On cible les écritures les plus risquées
            df['is_round'] = (df['debit'] % 100 == 0) & (df['debit'] > 1000)
            keywords = ['divers', 'regularisation', 'gift', 'cadeau', 'espece', 'honoraires', 'consulting']
            df['is_suspect'] = df['ecriture_lib'].astype(str).str.contains('|'.join(keywords), case=False, na=False)
            
            risky_lines = df[
                df['is_round'] | df['is_suspect'] | (df['journal_code'] == 'OD')
            ].sort_values(by='debit', ascending=False).head(30)
            
            if len(risky_lines) < 5:
                risky_lines = df.sort_values(by='debit', ascending=False).head(10)

            # Préparation des données pour l'IA
            cols = ['journal_code', 'ecriture_date', 'compte_num', 'ecriture_lib', 'debit', 'credit', 'cycle_calcule']
            final_cols = [c for c in cols if c in risky_lines.columns]
            data_json = risky_lines[final_cols].to_json(orient="records")

            if os.environ.get("ANTHROPIC_API_KEY"):
                ai_anomalies = self._ask_claude_expert(data_json)
                anomalies.extend(ai_anomalies)

        except Exception as e:
            print(f"Erreur IA : {e}")

        return anomalies



    def analyser_document_pdf_excel(self, texte):
        """
        Analyse simple d'un document PDF ou Excel.
        Cherche des mots clés suspects et renvoie des anomalies.
        """
        anomalies = []

        if not texte.strip():
            return anomalies

        # Liste de mots-clés suspects
        keywords = ['divers', 'regularisation', 'cadeau', 'honoraires', 'consulting', 'espece', 'gift']
        for kw in keywords:
            if kw.lower() in texte.lower():
                anomalies.append({
                    "cycle": "DOCUMENT",
                    "type_anomalie": "CONTENU SUSPICIEUX",
                    "niveau_criticite": "FAIBLE",
                    "score_ml": 50,
                    "montant": 0,
                    "description": f"Mot clé suspect détecté : {kw}"
                })

        if not anomalies:
            anomalies.append({
                "cycle": "DOCUMENT",
                "type_anomalie": "CONTENU",
                "niveau_criticite": "FAIBLE",
                "score_ml": 10,
                "montant": 0,
                "description": f"Document analysé, {len(texte)} caractères détectés."
            })

        return anomalies




    def _ask_claude_expert(self, json_data):
        """Prompt Expert-Comptable pour Claude"""
        
        prompt = f"""
        AGIS COMME UN COMMISSAIRE AUX COMPTES SENIOR (AUDITEUR LÉGAL).
        
        Tu dois analyser ces écritures comptables (FEC) et identifier les fraudes ou erreurs graves.
        
        RÈGLES D'ANALYSE STRICTES :
        1. Utilise UNIQUEMENT les cycles d'audit standards (CLIENTS, FOURNISSEURS, TRESORERIE, IMMO, PERSONNEL, CAPITAUX, OD).
        2. Tes descriptions doivent être techniques et détaillées (mentionne le risque fiscal ou comptable).
        3. Détecte : les écritures sans justification claire, les doublons potentiels, les problèmes de TVA, les charges fictives.

        DONNÉES À ANALYSER :
        {json_data}

        FORMAT DE RÉPONSE ATTENDU (JSON UNIQUEMENT) :
        [
            {{
                "cycle": "NOM_DU_CYCLE (ex: FOURNISSEURS)",
                "type_anomalie": "FRAUDE / ERREUR / FISCAL / CUT-OFF",
                "niveau_criticite": "CRITIQUE (si >10k€ ou fraude) ou ELEVE",
                "score_ml": 95,
                "montant": 12500.00,
                "description": "DESCRIPTION DÉTAILLÉE : Explique pourquoi c'est suspect."
            }}
        ]
        
        Si rien de grave, renvoie [].
        """

        try:
            # --- CORRECTION ICI : ON UTILISE LE MODÈLE HAIKU (COMPATIBILITÉ MAXIMALE) ---
            message = self.claude_client.messages.create(
                model="claude-3-haiku-20240307", 
                max_tokens=2500,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            content = message.content[0].text
            start = content.find('[')
            end = content.rfind(']') + 1
            return json.loads(content[start:end])
        except:
            return []

    # --- MÉTHODES PYTHON ---

    def _analyse_benford(self, df):
        target_df = df[df['compte_num'].astype(str).str.startswith(('6', '7'))]
        if len(target_df) < 50: return []
        
        first_digits = target_df['debit'].astype(str).str[:1]
        first_digits = first_digits[first_digits.str.isnumeric()].astype(int)
        freq_1 = (first_digits == 1).mean()
        
        if freq_1 < 0.20 or freq_1 > 0.40:
            return [{
                "cycle": "CHARGES_EXPLOITATION", 
                "type_anomalie": "STATISTIQUE (BENFORD)",
                "niveau_criticite": "ELEVE",
                "score_ml": 85.0, 
                "montant": 0,
                "description": f"Anomalie statistique globale. La fréquence du chiffre '1' est de {round(freq_1*100, 1)}% (Norme: ~30%)."
            }]
        return []

    def _analyse_tracfin(self, df):
        alerts = []
        treso = df[df['compte_num'].astype(str).str.startswith('5')]
        smurfing = treso[(treso['debit'] >= 9000) & (treso['debit'] < 10000)]
        
        if len(smurfing) >= 1:
            alerts.append({
                "cycle": "TRESORERIE", 
                "type_anomalie": "BLANCHIMENT (TRACFIN)",
                "niveau_criticite": "CRITIQUE",
                "score_ml": 98.0, 
                "montant": float(smurfing['debit'].sum()),
                "description": f"ALERTE LÉGALE : {len(smurfing)} mouvements de trésorerie identifiés juste en dessous du seuil de déclaration (9k€-10k€). Risque élevé de fractionnement (Smurfing)."
            })
        return alerts
    

    def ask_audit_assistant(self, question, anomalies):

        if not question:
            return "Veuillez poser une question."

        if not anomalies or len(anomalies) == 0:
            return "Aucune anomalie n'a été détectée pour cette mission."

        q = question.lower()

        # 🔎 Nombre d'anomalies
        if "combien" in q and "anomal" in q:
            return f"{len(anomalies)} anomalies ont été détectées dans cette mission."

        # ⚠️ Anomalie la plus critique
        if "plus critique" in q:
            critiques = [a for a in anomalies if a.get("niveau_criticite") == "CRITIQUE"]
            if critiques:
                return f"L'anomalie la plus critique est : {critiques[0].get('description')}"
            return "Aucune anomalie critique détectée."

        # 📊 Résumé
        if "résumé" in q or "resume" in q:
            critiques = len([a for a in anomalies if a.get("niveau_criticite") == "CRITIQUE"])
            eleve = len([a for a in anomalies if a.get("niveau_criticite") == "ÉLEVÉ"])
            moyen = len([a for a in anomalies if a.get("niveau_criticite") == "MOYEN"])
            faible = len([a for a in anomalies if a.get("niveau_criticite") == "FAIBLE"])

            return (
                f"Résumé des anomalies :\n"
                f"- Critiques : {critiques}\n"
                f"- Élevées : {eleve}\n"
                f"- Moyennes : {moyen}\n"
                f"- Faibles : {faible}"
            )

        # 🎯 Conseil
        if "priorité" in q or "corriger" in q:
            critiques = [a for a in anomalies if a.get("niveau_criticite") == "CRITIQUE"]
            if critiques:
                return "Vous devez corriger en priorité les anomalies CRITIQUES."
            return "Aucune anomalie critique. Vérifiez les anomalies élevées."

        # 🧠 Réponse par défaut
        return f"Il y a {len(anomalies)} anomalies détectées. Posez une question plus précise."
