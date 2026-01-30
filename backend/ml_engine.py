import pandas as pd
import numpy as np
import os
import json
import anthropic
from datetime import datetime

class AuditEngine:
    def __init__(self, mission_id):
        self.mission_id = mission_id
        api_key = os.environ.get("ANTHROPIC_API_KEY", "clé_manquante")
        self.claude_client = anthropic.Anthropic(api_key=api_key)

    def _determiner_cycle(self, compte_num):
        """Assigne un des 21 cycles d'audit selon le numéro de compte"""
        c = str(compte_num).strip()
        
        if c.startswith('10') or c.startswith('11') or c.startswith('12'): return "CAPITAUX_PROPRES"
        if c.startswith('15'): return "PROVISIONS"
        if c.startswith('16'): return "EMPRUNTS"
        if c.startswith('2'): return "IMMO_CORPORELLES" # Simplification pour MVP
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
        
        return "OPERATIONS_DIVERSES" # Par défaut

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
            # Critères : Montants ronds, Libellés vagues, OD manuelles, Weekend
            df['is_round'] = (df['debit'] % 100 == 0) & (df['debit'] > 1000)
            keywords = ['divers', 'regularisation', 'gift', 'cadeau', 'espece', 'honoraires', 'consulting']
            df['is_suspect'] = df['ecriture_lib'].astype(str).str.contains('|'.join(keywords), case=False, na=False)
            
            # On prend les 30 lignes les plus suspectes
            risky_lines = df[
                df['is_round'] | df['is_suspect'] | (df['journal_code'] == 'OD')
            ].sort_values(by='debit', ascending=False).head(30)
            
            if len(risky_lines) < 5:
                # Si pas assez de suspects, on prend les plus gros montants
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
                "description": "DESCRIPTION DÉTAILLÉE : Explique pourquoi c'est suspect. Ex: 'Écriture d'OD sans tiers au crédit du compte 401, montant rond atypique, risque de dissimulation de charges.'"
            }}
        ]
        
        Si rien de grave, renvoie []. Ne sois pas trop sensible, cherche les vrais problèmes.
        """

        try:
            message = self.claude_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=2500,
                temperature=0,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extraction propre du JSON
            content = message.content[0].text
            start = content.find('[')
            end = content.rfind(']') + 1
            return json.loads(content[start:end])
        except:
            return []

    # --- MÉTHODES PYTHON ---

    def _analyse_benford(self, df):
        # Benford s'applique surtout aux charges et produits externes
        target_df = df[df['compte_num'].astype(str).str.startswith(('6', '7'))]
        if len(target_df) < 50: return []
        
        first_digits = target_df['debit'].astype(str).str[:1]
        first_digits = first_digits[first_digits.str.isnumeric()].astype(int)
        freq_1 = (first_digits == 1).mean()
        
        if freq_1 < 0.20 or freq_1 > 0.40:
            return [{
                "cycle": "CHARGES_EXPLOITATION", # On attribue au cycle Charges par défaut
                "type_anomalie": "STATISTIQUE (BENFORD)",
                "niveau_criticite": "ELEVE",
                "score_ml": 85.0, 
                "montant": 0,
                "description": f"Anomalie statistique globale sur le cycle Charges. La fréquence du chiffre '1' est de {round(freq_1*100, 1)}% (Norme: ~30%). Indice de manipulation possible des factures."
            }]
        return []

    def _analyse_tracfin(self, df):
        alerts = []
        # Smurfing sur comptes de trésorerie (Classe 5)
        treso = df[df['compte_num'].astype(str).str.startswith('5')]
        smurfing = treso[(treso['debit'] >= 9000) & (treso['debit'] < 10000)]
        
        if len(smurfing) >= 1:
            alerts.append({
                "cycle": "TRESORERIE", # Cycle Trésorerie
                "type_anomalie": "BLANCHIMENT (TRACFIN)",
                "niveau_criticite": "CRITIQUE",
                "score_ml": 98.0, 
                "montant": float(smurfing['debit'].sum()),
                "description": f"ALERTE LÉGALE : {len(smurfing)} mouvements de trésorerie identifiés juste en dessous du seuil de déclaration (9k€-10k€). Risque élevé de fractionnement (Smurfing)."
            })
        return alerts

    def _analyse_comptes_sensibles(self, df):
        res = []
        # Caisse négative
        if 'compte_num' in df.columns:
            caisse = df[df['compte_num'].astype(str).str.startswith('53')]
            solde = caisse['debit'].sum() - caisse['credit'].sum()
            if solde < -10:
                 res.append({
                    "cycle": "TRESORERIE",
                    "type_anomalie": "COHÉRENCE COMPTABLE",
                    "niveau_criticite": "CRITIQUE",
                    "score_ml": 100.0, 
                    "montant": float(abs(solde)),
                    "description": f"Solde de caisse créditeur (négatif) de {abs(solde)} €. C'est une impossibilité physique indiquant souvent des recettes non déclarées ou des sorties d'espèces injustifiées."
                })
        return res