# 📘 Guide d'Intégration Technique & MLOps : Approches LLM et Machine Learning dans ZenAssist

---

## 📑 Sommaire
1. [Introduction & Contexte du Projet](#1-introduction--contexte-du-projet)
2. [Architecture Globale du Système (Double Moteur / Dual-Engine)](#2-architecture-globale-du-système-double-moteur--dual-engine)
3. [Intégration de l'Approche LLM (Google Gemini)](#3-intégration-de-lapproche-llm-google-gemini)
4. [Intégration de l'Approche Machine Learning (Scikit-Learn & FastAPI)](#4-intégration-de-lapproche-machine-learning-scikit-learn--fastapi)
5. [Pipeline CI/CD & Versioning des Modèles (GitHub Actions)](#5-pipeline-cicd--versioning-des-modèles-github-actions)
6. [Interface Utilisateur & Expérience Développeur (React / Next.js)](#6-interface-utilisateur--expérience-développeur-react--nextjs)
7. [Tableau Comparatif & Analyse Décisionnelle (ML vs LLM)](#7-tableau-comparatif--analyse-décisionnelle-ml-vs-llm)
8. [Guide de Démonstration pour la Soutenance](#8-guide-de-démonstration-pour-la-soutenance)

---

## 1. Introduction & Contexte du Projet

Le projet **ZenAssist** a pour objectif d'automatiser le tri et l'étiquetage des réclamations clients financières (données officielles du *Consumer Financial Protection Bureau* - CFPB) vers **10 catégories métiers distinctes** :
1. `Credit reporting` (Rapports de solvabilité & usurpation d'identité)
2. `Credit card / Prepaid card` (Cartes de crédit et prépayées)
3. `Bank account / Savings` (Comptes courants & livrets d'épargne)
4. `Debt collection` (Recouvrement de créances)
5. `Mortgage` (Prêts immobiliers & hypothèques)
6. `Student loan` (Prêts étudiants)
7. `Payday & Personal loan` (Prêts personnels & avances sur salaire)
8. `Money transfer / Crypto` (Virements bancaires & cryptomonnaies)
9. `Vehicle loan / Lease` (Prêts & leasing automobile)
10. `Other financial service` (Autres services financiers)

Afin de recommander la solution industrielle optimale, nous avons implémenté et intégré au sein de la même application deux paradigmes d'Intelligence Artificielle :
* **Une approche générative externe (LLM)** : basée sur le modèle de pointe *Google Gemini 3.5 Flash Lite*.
* **Une approche supervisée classique locale (Machine Learning)** : basée sur une vectorisation *TF-IDF* couplée à une *Régression Logistique* sérialisée en micro-service REST *FastAPI*.

---

## 2. Architecture Globale du Système (Double Moteur / Dual-Engine)

L'architecture repose sur une cohabitation propre et découplée entre l'application Web (Next.js), le micro-service de prédiction ML (FastAPI), l'API Cloud (Google Gemini) et la base de données relationnelle (PostgreSQL).

```
 +-----------------------------------------------------------------------------------+
 |                             APPLICATION ZENASSIST (React / Next.js)              |
 |                                    http://localhost:3000                          |
 |                                                                                   |
 |  [ Liste des Réclamations ]             [ Panneau Détaillé : TagSelector ]        |
 |   - 🏷️ Tagger Manuel                    - 🏷️ 10 Badges 1-clic + Menu déroulant   |
 |   - ⚡ Auto-tag ML                      - ⚡ Bouton Modèle ML (FastAPI)           |
 |   - ✨ Auto-tag LLM                     - ✨ Bouton Gemini LLM                    |
 |                                         - ✕ Bouton Retirer le tag (Untag)         |
 +-----------------------+----------------------------------+------------------------+
                         |                                  |
           (Route Interne POST /auto-tag-ml)   (Route Interne POST /auto-tag)
                         |                                  |
                         v                                  v
+------------------------------------+    +------------------------------------+
|    MICRO-SERVICE PYTHON FASTAPI    |    |      GOOGLE GEMINI CLOUD API       |
|        http://localhost:8000       |    |      (gemini-3.5-flash-lite)       |
|                                    |    |                                    |
| - Modèle model.pkl chargé en RAM   |    | - Prompt système strict            |
| - Inférence locale TF-IDF + LogReg |    | - Extraction de la catégorie JSON  |
| - Latence : ~2 ms                  |    | - Latence : ~450 ms                |
+-----------------+------------------+    +-----------------+------------------+
                  |                                         |
                  +--------------------+--------------------+
                                       |
                                       v (Sauvegarde du Tag)
                    +-------------------------------------+
                    |       POSTGRESQL LOCAL (Port 5433)   |
                    |           Table : claims            |
                    +-------------------------------------+
```

---

## 3. Intégration de l'Approche LLM (Google Gemini)

### 3.1. Choix du Modèle & SDK
* **Modèle sélectionné** : `gemini-3.5-flash-lite` (très économique, ultra-réactif et suffisant pour des tâches de classification textuelle fermée).
* **SDK Utilisé** : `@google/genai` (SDK officiel moderne de Google).

### 3.2. Route API Backend (`/api/claims/[id]/auto-tag/route.js`)
Pour des raisons de sécurité, la clé d'API Google (`GEMINI_API_KEY`) reste cantonnée au backend Next.js et n'est jamais exposée au navigateur client.

1. **Récupération du texte** : La route lit la réclamation dans PostgreSQL via `getClaimById(claimId)`.
2. **Ingénierie du Prompt (Prompt Engineering)** :
   ```javascript
   const systemPrompt = `Tu es un expert en classification de réclamations financières.
Tu dois classifier la réclamation client ci-dessous dans l'UNE SEULE des 10 catégories suivantes :
${ALLOWED_TAGS.map((tag, i) => `${i + 1}. ${tag}`).join('\n')}

RÈGLES STRICTES :
- Réponds UNIQUEMENT et EXACTEMENT par le nom de la catégorie officielle choisie.
- Aucun texte introductif, aucune explication, aucun point final.`;
   ```
3. **Appel au modèle** :
   ```javascript
   const ai = new GoogleGenAI({ apiKey });
   const response = await ai.models.generateContent({
     model: 'gemini-3.5-flash-lite',
     contents: `${systemPrompt}\n\nRéclamation client :\n"""${claim.content}"""`,
   });
   ```
4. **Post-traitement et Normalisation** : La fonction `matchAllowedTag` garantit que la réponse textuelle correspond exactement à une catégorie de `ALLOWED_TAGS`.
5. **Persistance en base de données** : Le tag identifié est enregistré dans PostgreSQL via `setClaimTag(claimId, matchedTag)`.

---

## 4. Intégration de l'Approche Machine Learning (Scikit-Learn & FastAPI)

L'intégration du modèle supervisé classique nécessite de passer d'un environnement de Data Science (Jupyter Notebook / Python) à un composant logiciel serveur autonome.

### 4.1. Encapsulation du Pipeline (`model_pipeline.py`)
Nous avons conçu une classe unifiée `ZenAssistModelPipeline` qui encapsule :
* Le vectoriseur `TfidfVectorizer` (vocabulaire de 50 000 n-grammes, stopwords + nettoyage des masques `xxxx`).
* Le classifieur `LogisticRegression` ($C=1.0$).
* Le `LabelEncoder` (conversion entiers $\leftrightarrow$ noms textuels des classes).

```python
class ZenAssistModelPipeline:
    def __init__(self, vectorizer, classifier, label_encoder):
        self.vectorizer = vectorizer
        self.classifier = classifier
        self.label_encoder = label_encoder
        self.classes_ = list(label_encoder.classes_)

    def predict(self, texts):
        X_tfidf = self.vectorizer.transform([texts] if isinstance(texts, str) else texts)
        y_pred = self.classifier.predict(X_tfidf)
        return self.label_encoder.inverse_transform(y_pred)

    def predict_proba(self, texts):
        X_tfidf = self.vectorizer.transform([texts] if isinstance(texts, str) else texts)
        return self.classifier.predict_proba(X_tfidf)
```

### 4.2. Le Micro-Service REST FastAPI (`ml_api.py`)
Ce serveur Python écoute sur le port `8000` et offre :
1. **Chargement unique en mémoire vive (`lifespan`)** :
   Le fichier sérialisé `model.pkl` est chargé une seule fois au démarrage de l'API. Chaque prédiction ultérieure est ainsi exécutée en **~2 millisecondes** sans aucun accès disque.
2. **Validation stricte avec Pydantic** :
   ```python
   class ClaimRequest(BaseModel):
       user_claim: str = Field(..., min_length=3, description="Texte de la réclamation")

   class PredictionResponse(BaseModel):
       tag: str
       confidence: float
       latency_ms: float
   ```
3. **Route `POST /tags`** : Reçoit `{"user_claim": "..."}`, exécute `predict()` et `predict_proba()`, et retourne la catégorie avec son score de confiance et le temps d'inférence exact.
4. **Middleware CORS** : Autorise Next.js (`localhost:3000`) à requêter FastAPI (`localhost:8000`).
5. **Documentation interactive Swagger** : Accessible en direct sur `http://localhost:8000/docs`.

### 4.3. Route Proxy Next.js (`/api/claims/[id]/auto-tag-ml/route.js`)
L'application Next.js interroge FastAPI via `fetch('http://localhost:8000/tags')`, met à jour la base PostgreSQL et renvoie à l'interface les métadonnées de performance (latence, indice de confiance).

---

## 5. Pipeline CI/CD & Versioning des Modèles (GitHub Actions)

Pour garantir la reproductibilité et la traçabilité des modèles ML en production, nous avons mis en place un workflow d'intégration et déploiement continus (CI/CD) dans [`.github/workflows/model_release.yml`](file:///home/obarthe/Bureau/Formation_Dev_IA/Projet12/.github/workflows/model_release.yml).

### 5.1. Déclencheurs (*Triggers*)
* **Automatique** : Lors de la publication d'une Release officielle sur GitHub (ex: `v1.0.0`).
* **Manuel** : Via le bouton *Run workflow* (`workflow_dispatch`).

### 5.2. Étapes du Workflow
1. `actions/checkout@v4` : Récupération du code source.
2. `actions/setup-python@v5` : Configuration de Python 3.12 et cache `pip`.
3. `pip install -r requirements.txt` : Installation des dépendances.
4. `python export_model.py` : Entraînement/Vérification, sérialisation de `model.pkl` et calcul des métriques exportées dans `metrics.json`.
5. `actions/upload-artifact@v4` : Sauvegarde des artefacts d'évaluation.
6. `softprops/action-gh-release@v2` : Attachement automatique des fichiers `model.pkl` et `metrics.json` dans la Release GitHub.

---

## 6. Interface Utilisateur & Expérience Développeur (React / Next.js)

L'interface web a été enrichie pour offrir une comparaison vivante et une flexibilité totale :

1. **Composant [`Claim.jsx`](file:///home/obarthe/Bureau/Formation_Dev_IA/Projet12/zenassist-app/javascript/src/components/Claim.jsx)** :
   * **Bouton `🏷️ Manuel`** : Sélectionne la réclamation et active le panneau manuel.
   * **Bouton `⚡ ML` (Violet)** : Déclenche l'inférence ultra-rapide par le modèle Machine Learning (FastAPI).
   * **Bouton `✨ LLM` (Turquoise)** : Déclenche l'analyse par Google Gemini.
   * **Notifications Toast (Sonner)** : Affiche immédiatement le moteur utilisé, la latence et le score de confiance.

2. **Composant [`TagSelector.jsx`](file:///home/obarthe/Bureau/Formation_Dev_IA/Projet12/zenassist-app/javascript/src/components/TagSelector.jsx)** :
   * **10 Badges 1-clic** : Permet d'attribuer manuellement une catégorie sans ouvrir de menu.
   * **Menu déroulant classique** : Pour une sélection standard.
   * **Bouton `✕ Retirer le tag`** : Permet de dé-tagger un ticket pour le renvoyer dans *Untagged*.
   * **Double bouton IA** : Pour tester et comparer les moteurs en temps réel.
   * **Boîte de métadonnées** : Résume le moteur utilisé, la latence en millisecondes et la confiance.

3. **Scripts d'Exploitation Clé en Main** :
   * [`start_app.sh`](file:///home/obarthe/Bureau/Formation_Dev_IA/Projet12/zenassist-app/start_app.sh) : Démarre en une commande PostgreSQL (port 5433), l'API FastAPI (port 8000) et Next.js (port 3000).
   * [`stop_app.sh`](file:///home/obarthe/Bureau/Formation_Dev_IA/Projet12/zenassist-app/stop_app.sh) : Coupe proprement tous les processus de fond.
   * [`reset_db.sh`](file:///home/obarthe/Bureau/Formation_Dev_IA/Projet12/zenassist-app/reset_db.sh) : Réinitialise la base PostgreSQL avec **100 réclamations réelles diversifiées** (10 exemples équilibrés par catégorie).

---

## 7. Tableau Comparatif & Analyse Décisionnelle (ML vs LLM)

| Critère d'Évaluation | 🤖 Approche Machine Learning (Régression Logistique) | ✨ Approche LLM (Google Gemini 3.5 Flash Lite) | Avantage & Analyse |
| :--- | :---: | :---: | :--- |
| **Accuracy Globale** | **85.20%** | **81.00%** | 🏆 **Machine Learning (+4.20 points)** |
| **F1-Score Pondéré** | **0.8488** | **0.8100** | 🏆 **Machine Learning** (Plus équilibré sur les classes minoritaires) |
| **Latence Moyenne / Inférence** | **~2 ms** (Local) | **~450 ms** (Réseau Cloud) | 🏆 **Machine Learning (200x plus rapide)** |
| **Coût Récurrent d'Inférance** | **0.00 €** (CPU local) | Facturé au token / requête | 🏆 **Machine Learning** (Aucun coût d'API récurrent) |
| **Dépendance Réseau / API** | **Autonome & Privé** (On-Premise / Edge) | Dépendance externe (Connexion Internet / Quotas) | 🏆 **Machine Learning** (Gouvernance des données et sécurité bancaire) |
| **Facilité de Mise en Place** | Nécessite un pipeline d'entraînement & MLOps | Rapide via Prompt Engineering | 🏆 **LLM** (Prototypage initial sans entraînement) |

> 💡 **Recommandation Finale pour ZenAssist** :  
> Le **Machine Learning (Régression Logistique + TF-IDF)** est la solution de référence à déployer en production : il est plus précis, instantané, gratuit à l'usage, et respecte la confidentialité stricte des données financières bancaires. Le **LLM** reste une excellente alternative de secours ou de prototypage rapide.

---

## 8. Guide de Démonstration pour la Soutenance

Pour présenter votre projet avec brio devant l'évaluateur :

1. **Démarrer l'infrastructure** :
   ```bash
   ./zenassist-app/start_app.sh
   ```
2. **Ouvrir le navigateur** sur [http://localhost:3000](http://localhost:3000).
3. **Montrer la documentation Swagger** sur [http://localhost:8000/docs](http://localhost:8000/docs) pour prouver le bon fonctionnement de votre micro-service Python FastAPI.
4. **Faire la démonstration interactive côte à côte** :
   * Sélectionner un ticket et cliquer sur **`⚡ ML`** : souligner la vitesse éclair (**~2 ms**) et la notification avec score de confiance.
   * Sélectionner un ticket et cliquer sur **`✨ LLM`** : montrer l'appel à Google Gemini (**~450 ms**).
   * Montrer l'assignation manuelle en 1 clic via les pastilles de catégories.
   * Montrer la suppression d'un tag avec **`✕ Retirer le tag`**.
5. **Démontrer la réinitialisation de la base** dans un terminal :
   ```bash
   ./zenassist-app/reset_db.sh
   ```
   Rafraîchir la page web (**F5**) pour montrer les 100 tickets réinitialisés.
6. **Présenter le repository GitHub** : Montrer la **Release v1.0.0** avec les artefacts attachés (`model.pkl` et `metrics.json`) issus du workflow GitHub Actions CI/CD.
