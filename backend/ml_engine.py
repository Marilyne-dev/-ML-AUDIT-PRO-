import pandas as pd
import numpy as np
from datetime import datetime

class AuditEngine:
    def __init__(self, mission_id):
        self.mission_id = mission_id

    def analyse_benford(self, df):
        """Détecte si les chiffres semblent inventés (Loi de Benford)"""
        # On regarde le premier chiffre de chaque montant (ex: 120€ -> 1)
        # On ne prend que les montants positifs
        df_clean = df[df['debit'] > 0]
        if df_clean.empty:
            return None
        
        first_digits = df_clean['debit'].astype(str).str.extract(r'(\d)')[0].astype(int)
        counts = first_digits.value_counts(normalize=True).sort_index()
        
        # En théorie, le '1' apparaît 30% du temps
        # Si le '1' apparaît très peu, c'est suspect
        if counts.get(1, 0) < 0.20:
            return {
                "cycle": "GÉNÉRAL",
                "type": "FRAUDE POTENTIELLE",
                "criticite": "CRITIQUE",
                "score": 85.0,
                "description": f"Anomalie statistique (Loi de Benford). Le chiffre '1' n'apparaît que {counts.get(1, 0)*100:.1f}% au lieu de 30%.",
                "recommendation": "Vérifier l'authenticité des pièces justificatives."
            }
        return None

    def detecter_ecritures_weekend(self, df):
        """Détecte les écritures passées le samedi ou dimanche"""
        # Conversion de la colonne date
        df['ecriture_date'] = pd.to_datetime(df['ecriture_date'])
        weekend_ops = df[df['ecriture_date'].dt.dayofweek >= 5]
        
        anomalies = []
        for _, row in weekend_ops.iterrows():
            if row['debit'] > 1000: # On ne prend que les montants importants
                anomalies.append({
                    "cycle": "OPÉRATIONS DIVERSES",
                    "type": "CONTRÔLE INTERNE",
                    "criticite": "MODERE",
                    "score": 60.0,
                    "compte": row['compte_num'],
                    "libelle": row['ecriture_lib'],
                    "montant": row['debit'],
                    "description": f"Écriture passée un {row['ecriture_date'].strftime('%A')}.",
                    "recommendation": "Justifier le passage d'écritures un jour non ouvré."
                })
        return anomalies

    def detecter_seuil_tracfin(self, df):
        """Détecte les montants suspects proches de 10 000€"""
        # On cherche les montants entre 9500 et 9999
        suspects = df[(df['debit'] >= 9500) & (df['debit'] < 10000)]
        
        anomalies = []
        for _, row in suspects.iterrows():
            anomalies.append({
                "cycle": "TRESORERIE",
                "type": "TRACFIN",
                "criticite": "CRITIQUE",
                "score": 90.0,
                "compte": row['compte_num'],
                "libelle": row['ecriture_lib'],
                "montant": row['debit'],
                "description": "Montant proche du seuil de déclaration TRACFIN (10 000€). Risque de fractionnement.",
                "recommendation": "Analyser l'origine des fonds et l'identité du bénéficiaire."
            })
        return anomalies

    def executer_analyse_complete(self, df_fec):
        """Lance tous les tests et renvoie la liste finale des anomalies"""
        resultats = []
        
        # 1. Benford
        benford = self.analyse_benford(df_fec)
        if benford: resultats.append(benford)
        
        # 2. Weekend
        resultats.extend(self.detecter_ecritures_weekend(df_fec))
        
        # 3. Tracfin
        resultats.extend(self.detecter_seuil_tracfin(df_fec))
        
        return resultats