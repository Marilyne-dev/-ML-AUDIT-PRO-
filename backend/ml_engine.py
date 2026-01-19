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
        # Si la clé n'est pas encore là, on met une valeur bidon pour ne pas faire planter le démarrage
        api_key = os.environ.get("ANTHROPIC_API_KEY", "clé_manquante")
        self.claude_client = anthropic.Anthropic(api_key=api_key)

    def executer_analyse_v4(self, df):
        """
        Orchestrateur qui combine analyse statistique (Python) 
        et analyse qualitative (Claude AI)
        """
        anomalies = []
        
        # NOTE : df arrive déjà nettoyé par main.py
        # Les colonnes sont garanties d'être : 'journal_code', 'ecriture_date', 'compte_num', 'ecriture_lib', 'debit', 'credit'

        # Conversion numérique de sécurité (au cas où)
        # On remplace les virgules par des points et on force le type float
        for col in ['debit', 'credit']:
            if df[col].dtype == object:
                df[col] = df[col].astype(str).str.replace(',', '.', regex=False)
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        # --- PHASE 1 : ANALYSE PYTHON (RAPIDE) ---
        try:
            anomalies.extend(self._analyse_benford(df))
            anomalies.extend(self._analyse_tracfin(df))
            anomalies.extend(self._analyse_comptes_sensibles(df))
        except Exception as e:
            print(f"Erreur lors de l'analyse Python : {e}")
        
        # --- PHASE 2 : ANALYSE CLAUDE AI (INTELLIGENTE) ---
        try:
            # A. Filtrage des écritures "à risque" pour l'IA
            df['is_round'] = (df['debit'] % 100 == 0) & (df['debit'] > 0)
            
            keywords = ['cadeau', 'espece', 'divers', 'regularisation', 'honoraires', 'consulting', 'exceptionnel']
            
            # Utilisation de 'ecriture_lib' (le nom standardisé)
            df['is_suspect_text'] = df['ecriture_lib'].astype(str).str.contains('|'.join(keywords), case=False, na=False)
            
            # Sélection des lignes
            risky_lines = df[
                df['is_round'] | df['is_suspect_text'] | (df['journal_code'] == 'OD')
            ].sort_values(by='debit', ascending=False).head(40)
            
            # Fallback si pas assez de lignes
            if len(risky_lines) < 10:
                high_value = df.sort_values(by='debit', ascending=False).head(10)
                risky_lines = pd.concat([risky_lines, high_value]).drop_duplicates()

            # Préparation des données pour Claude
            # On s'assure de ne prendre que les colonnes qui existent
            cols_to_keep = ['journal_code', 'ecriture_date', 'compte_num', 'ecriture_lib', 'debit', 'credit']
            final_cols = [c for c in cols_to_keep if c in risky_lines.columns]
            
            data_for_ai = risky_lines[final_cols].to_json(orient="records")

            # Appel API
            if os.environ.get("ANTHROPIC_API_KEY"):
                ai_anomalies = self._ask_claude(data_for_ai)
                anomalies.extend(ai_anomalies)
            else:
                print("⚠️ Pas de clé API Claude détectée, analyse IA ignorée.")

        except Exception as e:
            print(f"Erreur lors de l'appel à Claude AI : {e}")

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

        try:
            message = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=2000,
                temperature=0,
                system="Tu es un assistant d'audit comptable rigoureux. Tu ne réponds qu'en JSON.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

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

    # --- MÉTHODES STATISTIQUES (HARD LOGIC) ---

    def _analyse_benford(self, df):
        # Utilisation de 'debit' qui est standardisé
        df_pos = df[df['debit'] > 0]
        if len(df_pos) < 50: return []
        
        # Extraction du premier chiffre
        first_digits = df_pos['debit'].astype(str).str.lstrip().str[:1]
        # On s'assure que ce sont des chiffres
        first_digits = first_digits[first_digits.str.isnumeric()].astype(int)
        
        if len(first_digits) == 0: return []

        freq_1 = (first_digits == 1).mean()
        
        # Loi de Benford : le 1 doit apparaître ~30.1% du temps
        if freq_1 < 0.20 or freq_1 > 0.40:
            return [{
                "cycle": "GÉNÉRAL", "type_anomalie": "BENFORD", "niveau_criticite": "ELEVE",
                "score_ml": 85.0, "montant": 0,
                "description": f"Loi de Benford non respectée (Fréquence du chiffre '1': {round(freq_1*100, 1)}% vs 30% attendu). Indice potentiel de manipulation globale."
            }]
        return []

    def _analyse_tracfin(self, df):
        alerts = []
        # Smurfing: entre 9000 et 10000 (juste sous le seuil légal de 10k)
        smurfing = df[(df['debit'] >= 9000) & (df['debit'] < 10000)]
        if len(smurfing) >= 1:
            alerts.append({
                "cycle": "TRESORERIE", "type_anomalie": "TRACFIN", "niveau_criticite": "CRITIQUE",
                "score_ml": 95.0, "montant": float(smurfing['debit'].sum()),
                "description": f"Détection de {len(smurfing)} écritures proches du seuil de déclaration (9k-10k€). Risque de fractionnement (Smurfing)."
            })
        return alerts

    def _analyse_comptes_sensibles(self, df):
        res = []
        # Caisse négative (Compte 53)
        # On utilise 'compte_num' qui est standardisé
        if 'compte_num' in df.columns:
            caisse = df[df['compte_num'].astype(str).str.startswith('53')]
            if not caisse.empty:
                solde = caisse['debit'].sum() - caisse['credit'].sum()
                # Un solde de caisse ne peut jamais être créditeur (négatif) physiquement
                if solde < -50: # On laisse une petite marge d'erreur de saisie
                     res.append({
                        "cycle": "TRESORERIE", "type_anomalie": "CAISSE NÉGATIVE", "niveau_criticite": "CRITIQUE",
                        "score_ml": 100.0, "montant": float(abs(solde)),
                        "description": f"La caisse est créditrice de {abs(solde)}€. Impossible physiquement (caisse vide = 0)."
                    })
        return res