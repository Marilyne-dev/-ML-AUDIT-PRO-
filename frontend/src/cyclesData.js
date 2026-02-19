export const CYCLES_DATA = {
  C01: {
    id: "C01", numero: 1, nom: "Ventes – Clients", emoji: "🛒", risque: "MOYEN",
    objectif: "Vérifier la complétude et la correcte évaluation du chiffre d'affaires et des créances associées. S'assurer du respect du cut-off et de l'évaluation des provisions pour douteux.",
    risques_specifiques: [
      "Importants arriérés d'anciens clients provisionnés à 100%",
      "Écarts entre encaissements et CA déclaré",
      "Absence de refacturation des loyers variables lors de résiliation de bail",
      "Non-respect des règles de provisionnement des créances douteuses",
      "Risque de cut-off sur les prestations de formation pluriannuelles"
    ],
    controles: [
      "Rapprochement Balance Auxiliaire / Balance Générale clients",
      "Vérification reclassement clients créditeurs au passif (cpt 419)",
      "Calcul et analyse du délai de règlement clients (DSO)",
      "Exploitation des réponses aux circularisations clients",
      "Contrôle provision pour créances douteuses (permanence des méthodes)",
      "Test de cut-off : journaux de ventes derniers mois de N",
      "Analyse des 15 premiers clients (concentration)",
      "Réconciliation clients intragroupe"
    ]
  },
  C02: {
    id: "C02", numero: 2, nom: "Achats – Fournisseurs", emoji: "🚚", risque: "MOYEN",
    objectif: "S'assurer que les charges et dettes fournisseurs sont complètes et évaluées. Vérifier l'exhaustivité du passif (FNP) et les délais légaux de règlement.",
    risques_specifiques: [
      "Paiement fournisseurs uniquement sur présentation de relevés",
      "Dépassements délais légaux règlement (risque sanction DGCCRF)",
      "Écart entre achats ventilés et achats déclarés pour RFA",
      "Recours important personnel intérimaire et sous-traitants"
    ],
    controles: [
      "Rapprochement Balance Auxiliaire / Balance Générale fournisseurs",
      "Calcul délai de règlement fournisseurs (DPO)",
      "Exploitation des circularisations fournisseurs",
      "Revue analytique et sondages sur les FNP (Factures Non Parvenues)",
      "Test de cut-off achats : journaux début N+1",
      "Test de passif non enregistré (décaissements post-clôture)",
      "Réconciliation fournisseurs intragroupe"
    ]
  },
  C03: {
    id: "C03", numero: 3, nom: "Trésorerie", emoji: "💰", risque: "MOYEN",
    objectif: "Vérifier l'existence et l'exactitude des disponibilités, la validité des rapprochements bancaires et l'inventaire physique de la caisse.",
    risques_specifiques: [
      "Trésorerie gérée en pool ou centralisée",
      "Écarts de caisse fréquents (risque de détournement)",
      "Mouvements internes non soldés entre comptes",
      "Sous-évaluation caisse à la clôture"
    ],
    controles: [
      "Obtention et validation des états de rapprochement bancaires",
      "Rapprochement soldes comptabilité / relevés bancaires",
      "Vérification apurement éléments en rapprochement",
      "Vérification caisse : inventaire physique visé",
      "Valeurs à l'encaissement : inventaire et rapprochement",
      "Confirmation bancaire (engagements, nantissements)",
      "Validation des ICNE (intérêts courus non échus)"
    ]
  },
  C04: {
    id: "C04", numero: 4, nom: "Stocks", emoji: "📦", risque: "ÉLEVÉ",
    objectif: "Vérifier l'existence physique, l'exhaustivité et la valorisation (FIFO/CUMP) des stocks ainsi que les provisions pour dépréciation.",
    risques_specifiques: [
      "Démarque importante (administrative ou vol)",
      "Absence d'interface gestion des achats / comptabilité",
      "Retraitement RFA sur stock forfaitaire",
      "Quantités négatives potentielles dans les systèmes"
    ],
    controles: [
      "Rapprochement état inventaire / comptabilité générale",
      "Participation à l'inventaire physique (observation)",
      "Contrôle de l'équation de stocks (SI + E - S = SF)",
      "Analyse des écarts significatifs stock théorique vs physique",
      "Sondages sur le prix de revient des marchandises",
      "Examen de la rotation des stocks",
      "Test de cut-off : derniers BL/BE de N",
      "Tests sur quantités négatives ou prix négatifs"
    ]
  },
  C05: {
    id: "C05", numero: 5, nom: "Immobilisations", emoji: "🏢", risque: "FAIBLE",
    objectif: "Vérifier l'existence, la propriété et les amortissements. Contrôler les mouvements d'acquisitions et de cessions.",
    risques_specifiques: [
      "Investissements financés par crédit-bail ou subventions",
      "Avances sur immobilisations importantes (compte 238)",
      "Risque de retraitement crédit-bail (IFRS 16)"
    ],
    controles: [
      "Tableau des immobilisations : mouvements acquis/cédés",
      "Vérification physique par sondage",
      "Calcul et contrôle des dotations aux amortissements",
      "Tests de dépréciation sur les actifs",
      "Contrôle immobilisations financières (titres, dépôts)",
      "Vérification de l'inscription en charges vs capitalisation"
    ]
  },
  C06: {
    id: "C06", numero: 6, nom: "Paie – Personnel", emoji: "👥", risque: "MOYEN",
    objectif: "Vérifier la comptabilisation des charges sociales et salariales, les provisions pour congés payés et la conformité URSSAF.",
    risques_specifiques: [
      "Moratoire ou plan d'apurement URSSAF en cours",
      "Paie établie au siège (absence de contrôle local)",
      "Risque requalification CDI pour personnel intérimaire",
      "Exonérations spécifiques DOM/TOM ou ZFU"
    ],
    controles: [
      "Rapprochement DADS/DSN / comptabilité générale",
      "Contrôle soldes et apurement dettes sociales",
      "Calcul et vérification provision congés payés et RTT",
      "Rémunération mandataires : conformité décisions AG",
      "Validation des exonérations spécifiques",
      "Circularisations organismes sociaux (CGSS, URSSAF)",
      "Rapprochement masse salariale brute N vs N-1"
    ]
  },
  C07: {
    id: "C07", numero: 7, nom: "Fiscal", emoji: "🏛️", risque: "FAIBLE",
    objectif: "Vérifier la conformité TVA, IS, CFE/CVAE et identifier les passifs fiscaux non enregistrés.",
    risques_specifiques: [
      "Problème de rapprochement TVA collectée",
      "Taxes spécifiques secteur formation",
      "Risque de provision insuffisante sur redressements en cours"
    ],
    controles: [
      "Revue analytique comparative N/N-1 des charges fiscales",
      "Concordance comptabilité / déclarations CA3",
      "Recherche passifs fiscaux (décaissements post-clôture)",
      "Contrôle TVA : fait générateur et autoliquidation",
      "Vérification conformité TVA déductible",
      "Contrôle CFE/CVAE : base imposable et taux",
      "Vérification provisions sur litiges fiscaux"
    ]
  },
  C08: {
    id: "C08", numero: 8, nom: "Capitaux Propres", emoji: "💼", risque: "FAIBLE",
    objectif: "Vérifier la structure financière (capital, réserves) et la conformité avec les décisions des organes sociaux (PV AG).",
    risques_specifiques: [
      "Capital détenu 50/50 (risque blocage décisionnel)",
      "Capitaux propres inférieurs à la moitié du capital social",
      "Traitement comptable des subventions d'équipement"
    ],
    controles: [
      "Vérification variations postes capitaux propres N vs N-1",
      "Conformité variations avec PV d'Assemblées Générales",
      "Vérification réserve légale correctement dotée",
      "Distributions dividendes : décision et versement",
      "Suivi des subventions d'investissement (compte 131)",
      "Vérification de la règle du 'quart du capital social'"
    ]
  },
  C09: {
    id: "C09", numero: 9, nom: "Emprunts et Dettes Fin.", emoji: "📑", risque: "FAIBLE",
    objectif: "Vérifier l'exactitude des dettes financières, les tableaux d'amortissement et les engagements (covenants).",
    risques_specifiques: [
      "Blocage antérieur d'échéances",
      "Respect des ratios bancaires (covenants)",
      "Engagements hors bilan (nantissements) non mentionnés"
    ],
    controles: [
      "Rapprochement avec tableaux d'amortissement des emprunts",
      "Vérification des taux (indexation, taux variable)",
      "Calcul et rapprochement des intérêts courus (ICNE)",
      "Confirmation bancaire : encours et garanties",
      "Vérification des dettes en devises (taux de clôture)",
      "Réciprocité des comptes courants intragroupe"
    ]
  },
  C10: {
    id: "C10", numero: 10, nom: "Autres Provisions / Engagements", emoji: "📋", risque: "FAIBLE",
    objectif: "Vérifier l'exhaustivité des provisions pour risques et charges et identifier les engagements hors bilan.",
    risques_specifiques: [
      "Litiges en cours (sociaux, fiscaux, commerciaux)",
      "Engagements hors bilan non mentionnés en annexe",
      "Événements postérieurs à la clôture non traités"
    ],
    controles: [
      "Revue des litiges et circularisation des avocats",
      "Adéquation des provisions vs risques identifiés",
      "Analyse des événements postérieurs à la clôture",
      "Recensement des engagements (cautions, garanties)",
      "Vérification produits constatés d'avance (cut-off)"
    ]
  },
  C11: {
    id: "C11", numero: 11, nom: "Contrôle Interne", emoji: "🧠", risque: "MOYEN",
    objectif: "Évaluer transversalement la séparation des tâches, les procédures de caisse et les risques de fraude.",
    risques_specifiques: [
      "Absence d'interface ERP / comptabilité",
      "Paiement fournisseurs sur relevés sans contre-signature",
      "Accès systèmes non sécurisés",
      "Risque de fraude (norme ISA 240)"
    ],
    controles: [
      "Évaluation séparation des tâches (Achats/Ventes)",
      "Test des procédures d'autorisation des transactions",
      "Revue des accès et droits utilisateurs systèmes",
      "Test des contrôles automatisés sur les interfaces",
      "Revue des procédures de rapprochement bancaire",
      "Évaluation du risque de fraude globale"
    ]
  }
};