import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier

class AuditEngine:
    def __init__(self, mission_id):
        self.mission_id = mission_id
        # Modèle Random Forest configuré selon ton doc v4.0
        self.rf_model = RandomForestClassifier(
            n_estimators=200, 
            max_depth=12, 
            class_weight='balanced'
        )

    # ANALYSE CYCLE : TRÉSORERIE (TRACFIN)
    def analyse_tresorerie(self, df):
        anomalies = []
        # Détection Smurfing (9500€ - 9999€)
        tracfin = df[(df['debit'] >= 9500) & (df['debit'] < 10000)]
        for _, row in tracfin.iterrows():
            anomalies.append({
                "cycle": "TRESORERIE",
                "type_anomalie": "TRACFIN",
                "niveau_criticite": "CRITIQUE",
                "score_ml": 92.5,
                "description": "Opération proche du seuil de 10k€. Risque de blanchiment.",
                "montant": row['debit']
            })
        return anomalies

    # ANALYSE CYCLE : CLIENTS (EVALUATION)
    def analyse_clients(self, df):
        anomalies = []
        # Détection des écritures sans libellé pro
        sans_libelle = df[(df['compte_num'].str.startswith('411')) & (df['ecriture_lib'].isna())]
        for _, row in sans_libelle.iterrows():
            anomalies.append({
                "cycle": "CLIENTS",
                "type_anomalie": "EVALUATION",
                "niveau_criticite": "MODERE",
                "score_ml": 45.0,
                "description": "Écriture client sans libellé explicatif.",
                "montant": row['debit']
            })
        return anomalies

    # LANCEUR GLOBAL
    def executer_analyse_complete(self, df):
        resultats = []
        resultats.extend(self.analyse_tresorerie(df))
        resultats.extend(self.analyse_clients(df))
        # On peut ajouter ici les 19 autres cycles du document...
        return resultats