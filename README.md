# 🏦 ZenAssist : Classification Intelligente des Réclamations Clients (NLP & MLOps)

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![Next.js](https://img.shields.io/badge/Next.js-15.4.5-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi)
![Scikit--Learn](https://img.shields.io/badge/Scikit--Learn-1.6-orange?logo=scikit-learn)
![Google Gemini](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash%20Lite-8E75B2?logo=google)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)
![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions)

---

## 📌 Présentation du Projet

**ZenAssist** est une solution complète d'assistance intelligente conçue pour automatiser le tri et l'aiguillage des réclamations clients financières (issues de la base officielle du *Consumer Financial Protection Bureau* - CFPB) vers **10 catégories métiers cibles**.

Ce projet compare de manière empirique et industrielle deux paradigmes d'Intelligence Artificielle :
1. **L'approche générative externe (LLM)** : exploitant l'API cloud *Google Gemini 3.5 Flash Lite*.
2. **L'approche supervisée locale (Machine Learning classique)** : exploitant un pipeline *TF-IDF + Régression Logistique* servi par un micro-service REST *FastAPI*.

---

## 🗂️ Structure du Répertoire

```text
Projet12_ZenAssist/
├── .github/workflows/
│   └── model_release.yml              # Pipeline CI/CD GitHub Actions pour l'export & release du modèle
├── dataset/
│   ├── best_ml_model.joblib           # Modèle Logistic Regression entraîné
│   ├── tfidf_vectorizer.joblib        # Vectoriseur TF-IDF sérialisé
│   ├── label_encoder.joblib           # Encodeur de labels des 10 classes
│   ├── llm_test_sample.csv            # Échantillon de test (1 000 réclamations réelles)
│   ├── llm_predictions.csv            # Résultats d'inférence de Gemini
│   ├── llm_confusion_matrix.png       # Matrice de confusion de l'approche LLM
│   ├── ml_confusion_matrix.png        # Matrice de confusion de l'approche ML
│   └── ml_comparison_results.csv      # Tableau comparatif des algorithmes ML
├── zenassist-app/                     # Application Web ZenAssist (Fullstack React / Next.js)
│   ├── javascript/                    # Code source de l'application Next.js 15
│   │   ├── src/app/                   # App Router (pages & routes API)
│   │   │   └── api/claims/            # Routes backend (auto-tag ML, auto-tag LLM, tags)
│   │   ├── src/components/            # Composants UI (Claim, Inboxes, TagSelector)
│   │   └── src/database/              # Couche d'accès PostgreSQL & scripts de seed
│   ├── start_app.sh                   # Script de démarrage unifié (PostgreSQL + FastAPI + Next.js)
│   ├── stop_app.sh                    # Script d'arrêt propre des services
│   └── reset_db.sh                    # Réinitialisation de la base (100 réclamations diversifiées)
├── 01_analyse_exploratoire.ipynb      # Phase 1 : EDA sur 1.28M tickets & taxonomie des 10 catégories
├── 02_approche_llm.ipynb              # Phase 1 : Évaluation rigoureuse de Gemini 3.5 Flash Lite
├── 03_approche_ml.ipynb               # Phase 1 : Entraînement & benchmark ML (LogReg, Naive Bayes, SGD)
├── model_pipeline.py                  # Classe ZenAssistModelPipeline pour une sérialisation propre
├── export_model.py                    # Script d'export de model.pkl et metrics.json
├── ml_api.py                          # Micro-service d'API REST Python FastAPI (POST /tags)
├── generate_diverse_seed.py           # Générateur de 100 réclamations de test équilibrées
├── presentation_zenassist.pdf         # Support de présentation
├── requirements.txt                   # Dépendances Python du projet
└── .gitignore                         # Fichiers et dossiers exclus du suivi Git
```

---

## 🎯 Les 3 Phases du Projet & Résultats Clés

### 📊 Phase 1 : Analyse Exploratoire & Modélisation Comparative
* **Consolidation taxonomique** : Nettoyage de plus de 1,28 million de réclamations CFPB pour harmoniser les catégories historiques en **10 catégories consolidées**.
* **Nettoyage NLP sur-mesure** : Élimination des masques d'anonymisation du CFPB (`xxxx`, `xx`, `00`) pour purifier le vocabulaire.
* **Évaluation de Gemini 3.5 Flash Lite** : **81.00% d'Accuracy**, F1 pondéré de 0.81, latence moyenne de **0.458 s**.
* **Benchmark Machine Learning** :
  * *Logistic Regression* (Gagnante) : **85.20% d'Accuracy**, F1 pondéré de **0.8488**, latence de **~0.002 ms**.
  * *SGD Classifier (Linear SVM)* : 84.80% d'Accuracy.
  * *Multinomial Naive Bayes* : 80.90% d'Accuracy.
* **Support Exécutif** : Création de la présentation PowerPoint officielle [`presentation_zenassist.pptx`](presentation_zenassist.pptx) synthétisant la démarche et les recommandations MLOps.

---

### 💻 Phase 2 : Intégration de l'Approche LLM dans l'Application Web
* **Mise en place de l'application Next.js 15** : Interface moderne de gestion des tickets avec base relationnelle PostgreSQL.
* **Route Backend Google GenAI** : Conception de la route `POST /api/claims/[id]/auto-tag` exploitant le SDK officiel `@google/genai` avec prompt engineering strict et normalisation post-traitement.
* **Expérience Utilisateur Asynchrone** : Bouton d'action interactif, indicateur de chargement et notifications toasts via la librairie `sonner`.

---

### 🚀 Phase 3 : Industrialisation MLOps & Architecture Double Moteur
* **Pipeline CI/CD (GitHub Actions)** : Workflow automatisé sérialisant le modèle (`model.pkl`) et les métriques de validation (`metrics.json`) lors de la création d'une Release GitHub.
* **Micro-Service REST FastAPI (`ml_api.py`)** :
  * Chargement unique du modèle en mémoire vive (`lifespan`) pour une latence record (**~2 ms**).
  * Route `POST /tags` conforme au contrat d'interface (`{"user_claim": "..."}`).
  * Validation stricte des données d'entrée/sortie avec *Pydantic*.
  * Documentation interactive *Swagger UI* disponible sur `http://localhost:8000/docs`.
* **Architecture Double Moteur (Dual-Engine)** :
  * Sur chaque carte : Boutons distincts **`🏷️ Manuel`**, **`⚡ ML` (FastAPI)** et **`✨ LLM` (Gemini)**.
  * Panneau latéral droit : Assignation manuelle en 1-clic via **10 badges de catégories**, menu déroulant, et bouton de suppression de tag (**`✕ Retirer le tag`**).
* **Échantillon de Test Équilibré** : Base PostgreSQL réinitialisable avec **100 réclamations réelles diversifiées** (10 exemples par catégorie).

---

## ⚖️ Tableau Comparatif Décisionnel (ML vs LLM)

| Critère d'Évaluation | 🤖 Machine Learning (Régression Logistique) | ✨ LLM (Google Gemini 3.5 Flash Lite) | Avantage Décisionnel |
| :--- | :---: | :---: | :--- |
| **Accuracy Globale** | **85.20%** | **81.00%** | 🏆 **Machine Learning (+4.20 points)** |
| **F1-Score Pondéré** | **0.8488** | **0.8100** | 🏆 **Machine Learning** (Meilleur équilibre sur les classes rares) |
| **Latence d'Inférence** | **~2 ms** (Local) | **~450 ms** (Réseau Cloud) | 🏆 **Machine Learning (200x plus rapide)** |
| **Coût Récurrent d'Usage** | **0.00 €** (Inférence CPU locale) | Facturation au token / requête | 🏆 **Machine Learning** (0 € de coût récurrent) |
| **Confidentialité des Données** | **100% On-Premise** (Données privées) | Envoi des données vers une API tierce | 🏆 **Machine Learning** (Conformité bancaire RGPD) |
| **Mise en Place Initiale** | Pipeline d'entraînement requis | Prototypage immédiat sans entraînement | 🏆 **LLM** (Rapidité de démarrage) |

> 💡 **Recommandation Finale** : Le modèle de **Machine Learning (Régression Logistique + TF-IDF)** est la solution de référence pour le passage en production. Le **LLM** demeure une excellente solution complémentaire ou de secours.

---

## ⚡ Guide de Démarrage Rapide (Quickstart)

### 1. Prérequis
* **Python** : 3.11 ou 3.12
* **Node.js** : >= 20.x
* **PostgreSQL** : 16.x

---

### 2. Installation des Dépendances

```bash
# 1. Environnement virtuel Python & dépendances ML / FastAPI
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 2. Dépendances de l'application Next.js
cd zenassist-app/javascript
npm install
cd ../..
```

---

### 3. Configuration des Variables d'Environnement

Créez le fichier `zenassist-app/javascript/.env.local` :
```env
# Clé API Google Gemini (pour l'approche LLM)
GEMINI_API_KEY=votre_cle_api_gemini_ici

# Configuration de la base de données PostgreSQL locale
DB_HOST=/tmp
DB_PORT=5433
DB_NAME=dev_ia_p12
DB_USER=postgres
DB_PASSWORD=postgres

# URL du micro-service ML FastAPI
ML_API_URL=http://localhost:8000
```

---

### 4. Lancement de la Plateforme Complète

Une seule commande démarre simultanément **PostgreSQL (port 5433)**, **FastAPI (port 8000)** et **Next.js (port 3000)** :

```bash
./zenassist-app/start_app.sh
```

* 🌐 **Application Web ZenAssist** : [http://localhost:3000](http://localhost:3000)
* 📖 **Documentation Interactive FastAPI Swagger** : [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 5. Commandes d'Exploitation Utiles

* **Réinitialiser la base avec 100 réclamations vierges** :
  ```bash
  ./zenassist-app/reset_db.sh
  ```
* **Arrêter proprement tous les services (PostgreSQL & FastAPI)** :
  ```bash
  ./zenassist-app/stop_app.sh
  ```
* **Re-générer manuellement les artefacts du modèle (`model.pkl` et `metrics.json`)** :
  ```bash
  python export_model.py
  ```

---

## 👥 Auteur & Licence

* **Projet** : Formation Développeur IA - OpenClassrooms (Projet 12 : ZenAssist)
* **Auteur** : Olivier Barthe
* **Licence** : MIT
