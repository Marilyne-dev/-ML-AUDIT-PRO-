import pandas as pd
import numpy as np
import os
import json
import anthropic
from datetime import datetime

class AuditEngine:
    def __init__(self, mission_id):
        self.mission_id = mission_id
        # Initialisation du client Claude
        self.claude_client = anthropic.Anthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY")
        )

    def executer_analyse_v4(self, df):
        """
        Orchestrateur qui combine analyse statistique (Python) 
        et analyse qualitative (Claude AI)
        """
        anomalies = []
        
        # 1. Nettoyage et Normalisation des données
        # On s'assure que les colonnes sont en minuscules
        df.columns = [c.lower() for c in df.columns]
        
        # Mapping des colonnes FEC standard vers nos noms internes si besoin
        col_mapping = {
            'debit': 'debit', 'credit': 'credit', 
            'comptenum': 'compte_num', 'ecriturelib': 'ecriture_lib',
            'ecrituredate': 'ecriture_date', 'journalcode': 'journal_code'
        }
        
        # Vérification des colonnes minimales requises
        for standard_col in ['debit', 'credit', 'ecriturelib']:
            if standard_col not in df.columns:
                # Tentative de trouver la colonne correspondante dans le fichier FEC
                found = False
                for col in df.columns:
                    if standard_col in col:
                        df.rename(columns={col: standard_col}, inplace=True)
                        found = True
                        break
        
        # Conversion numérique
        df['debit'] = pd.to_numeric(df['debit'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
        df['credit'] = pd.to_numeric(df['credit'].astype(str).str.replace(',', '.'), errors='coerce').fillna(0)
        
        # --- PHASE 1 : ANALYSE PYTHON (RAPIDE) ---
        # On garde tes règles existantes qui sont très bien pour le "hard skills"
        anomalies.extend(self._analyse_benford(df))
        anomalies.extend(self._analyse_tracfin(df))
        anomalies.extend(self._analyse_comptes_sensibles(df))
        
        # --- PHASE 2 : ANALYSE CLAUDE AI (INTELLIGENTE) ---
        # On prépare un échantillon de données "suspectes" ou "à risque" pour l'IA
        # car on ne peut pas tout envoyer (limite de tokens et coût).
        
        # A. On filtre les écritures "à risque" pour l'IA :
        # - Montants ronds (souvent des estimations ou fraudes)
        # - Écritures le weekend
        # - Mots clés suspects dans les libellés
        # - Opérations Diverses (OD)
        
        df['is_round'] = (df['debit'] % 100 == 0) & (df['debit'] > 0)
        keywords = ['cadeau', 'espece', 'divers', 'regularisation', 'honoraires', 'consulting', 'exceptionnel']
        df['is_suspect_text'] = df['ecriturelib'].str.contains('|'.join(keywords), case=False, na=False)
        
        # On prend un échantillon des 50 lignes les plus "suspectes" pour l'IA
        risky_lines = df[
            df['is_round'] | df['is_suspect_text'] | (df['journal_code'] == 'OD')
        ].sort_values(by='debit', ascending=False).head(40)
        
        # Si on n'a pas assez de lignes suspectes, on prend des lignes aléatoires à fort montant
        if len(risky_lines) < 10:
            high_value = df.sort_values(by='debit', ascending=False).head(10)
            risky_lines = pd.concat([risky_lines, high_value]).drop_duplicates()

        # Conversion en texte pour l'IA
        data_for_ai = risky_lines[[
            'journal_code', 'ecriture_date', 'compte_num', 
            'ecriture_lib', 'debit', 'credit'
        ]].to_json(orient="records")

        # APPEL A CLAUDE
        try:
            ai_anomalies = self._ask_claude(data_for_ai)
            anomalies.extend(ai_anomalies)
        except Exception as e:
            print(f"Erreur lors de l'appel à Claude AI : {e}")
            # On ne bloque pas le processus si l'IA échoue

        return anomalies

    def _ask_claude(self, json_data):
        """Envoie les données à Claude pour une analyse d'audit"""
        
        prompt = f"""
        Tu es un Expert-Comptable et Commissaire aux Comptes expérimenté (Audit Légal).
        Je vais te fournir un extrait de Fichier des Écritures Comptables (FEC) au format JSON.
        
        Ta mission est d'analyser ces lignes pour détecter des anomalies potentielles :
        1. Fraude potentielle (écritures injustifiées, libellés vagues).
        2. Problèmes de Cut-off (mauvaise période).
        3. Anomalies fiscales (TVA, dépenses somptuaires).
        4. Risques de blanchiment.

        Voici les données :
        {json_data}

        Réponds UNIQUEMENT avec un JSON valide respectant strictement ce format (sans texte avant ni après) :
        [
            {{
                "cycle": "ACHATS" ou "VENTES" ou "TRESORERIE" ou "OD",
                "type_anomalie": "FRAUDE" ou "ERREUR" ou "FISCAL",
                "niveau_criticite": "CRITIQUE" ou "ELEVE" ou "MODERE",
                "score_ml": (un nombre entre 50 et 100 indiquant ta certitude),
                "montant": (le montant concerné si applicable, sinon 0),
                "description": "Explication courte et professionnelle de l'anomalie pour l'auditeur."
            }}
        ]
        
        Si tu ne trouves rien de grave, renvoie une liste vide [].
        """

        message = self.claude_client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=2000,
            temperature=0,
            system="Tu es un assistant d'audit comptable rigoureux. Tu ne réponds qu'en JSON.",
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extraction et parsing du JSON de la réponse
        try:
            raw_content = message.content[0].text
            # Nettoyage au cas où Claude ajouterait du texte autour
            start = raw_content.find('[')
            end = raw_content.rfind(']') + 1
            if start != -1 and end != -1:
                json_str = raw_content[start:end]
                return json.loads(json_str)
            else:
                return []
        except Exception as e:
            print(f"Erreur parsing JSON Claude: {e}")
            return []

    # --- MÉTHODES EXISTANTES (Hard Logic) ---

    def _analyse_benford(self, df):
        # Ta logique existante...
        df_pos = df[df['debit'] > 0]
        if len(df_pos) < 50: return []
        first_digits = df_pos['debit'].astype(str).str.extract(r'(\d)')[0].astype(int)
        freq_1 = (first_digits == 1).mean()
        if freq_1 < 0.25 or freq_1 > 0.35:
            return [{
                "cycle": "GÉNÉRAL", "type_anomalie": "BENFORD", "niveau_criticite": "ELEVE",
                "score_ml": 85.0, "montant": 0,
                "description": f"Loi de Benford non respectée (Freq '1': {round(freq_1*100, 1)}%). Indice potentiel de manipulation."
            }]
        return []

    def _analyse_tracfin(self, df):
        alerts = []
        # Smurfing: entre 9000 et 10000 (juste sous le seuil légal)
        smurfing = df[(df['debit'] >= 9000) & (df['debit'] < 10000)]
        if len(smurfing) >= 1:
            alerts.append({
                "cycle": "TRESORERIE", "type_anomalie": "TRACFIN", "niveau_criticite": "CRITIQUE",
                "score_ml": 95.0, "montant": float(smurfing['debit'].sum()),
                "description": f"Détection de {len(smurfing)} écritures proches du seuil de déclaration (Smurfing possible)."
            })
        return alerts

    def _analyse_comptes_sensibles(self, df):
        res = []
        # Caisse négative
        if 'compte_num' in df.columns:
            caisse = df[df['compte_num'].astype(str).str.startswith('53')]
            solde = caisse['debit'].sum() - caisse['credit'].sum()
            # Note: Normalement on calcule le solde cumulé, ici c'est simplifié
            if solde < 0: # C'est rare que le total débit < total crédit sur l'année sans anomalie
                 pass 
                 # Simplifié pour l'exemple, à affiner avec les A-Nouveaux
        return res