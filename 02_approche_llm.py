import os
import sys
import time
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from dotenv import load_dotenv

# Chargement automatique des clés depuis .env.local ou .env
load_dotenv('.env.local')
load_dotenv('.env')

def run_llm_evaluation(sample_path="dataset/llm_test_sample.csv", output_dir="dataset"):
    print("=" * 60)
    print("ÉTAPE 2 : ÉVALUATION DE L'APPROCHE LLM (GOOGLE GEMINI)")
    print("=" * 60)
    
    # 1. Vérification de la clé API
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print(" [ERREUR] Clé API non trouvée dans .env.local !")
        sys.exit(1)
        
    model_name = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")
    
    # 2. Chargement du SDK et du Modèle
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        use_new_sdk = True
        print(f"-> SDK google-genai chargé. Modèle utilisé : {model_name}")
    except ImportError:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        use_new_sdk = False
        print(f"-> SDK google-generativeai chargé. Modèle utilisé : {model_name}")

    # 3. Chargement de l'échantillon de test
    if not os.path.exists(sample_path):
        print(f" [ERREUR] Le fichier {sample_path} n'existe pas. Exécutez l'Étape 1 d'abord.")
        sys.exit(1)
        
    df_sample = pd.read_csv(sample_path)
    print(f"-> Échantillon de test chargé : {len(df_sample):,} exemples")
    
    categories = sorted(df_sample["Tag_Clean"].unique().tolist())
    print("\nCatégories autorisées (Taxonomie ZenAssist) :")
    for i, cat in enumerate(categories, 1):
        print(f"  {i:2d}. {cat}")

    # 4. Prompt Engineering (Prompt V2 Structuré)
    prompt_system = f"""Tu es un expert en classification automatique de réclamations de services financiers chez ZenAssist.
Ta mission est d'analyser le texte de la réclamation d'un client et de la classer dans EXACTEMENT UNE des catégories suivantes :

Catégories autorisées :
1. Credit reporting (Problèmes de rapports de crédit, corrections d'erreurs, agences de crédit)
2. Debt collection (Recouvrement de créances, harcèlement, sommes déjà payées)
3. Mortgage (Prêts immobiliers, saisies, frais d'hypothèque)
4. Credit card / Prepaid card (Cartes de crédit, cartes prépayées, frais non autorisés)
5. Bank account / Savings (Comptes courants, épargne, agios, virements bancaires d'agence)
6. Student loan (Prêts étudiants, remboursements, frais de scolarité)
7. Payday & Personal loan (Prêts personnels, prêts à court terme / à la journée)
8. Money transfer / Crypto (Transferts d'argent internationaux, services de monnaie virtuelle, crypto)
9. Vehicle loan / Lease (Prêts automobiles, leasing de véhicules)
10. Other financial service (Autres services financiers divers)

Règles impératives :
- Réponds UNIQUEMENT par le nom exact de la catégorie figurant dans la liste ci-dessus.
- Ne rajoute AUCUN texte d'introduction, AUCUNE explication, ni AUCUNE ponctuation supplémentaire.
"""

    def predict_one_with_retry(claim_text, max_retries=5):
        prompt = f"Réclamation client :\n\"\"\"\n{claim_text}\n\"\"\"\n\nCatégorie :"
        start_time = time.perf_counter()
        
        for attempt in range(1, max_retries + 1):
            try:
                if use_new_sdk:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=prompt_system,
                            temperature=0.0,
                            max_output_tokens=30,
                        )
                    )
                    text_out = response.text.strip() if response and response.text else "Erreur"
                else:
                    response = model.generate_content(
                        prompt,
                        generation_config={"temperature": 0.0, "max_output_tokens": 30}
                    )
                    text_out = response.text.strip() if response and response.text else "Erreur"
                
                elapsed = time.perf_counter() - start_time
                return text_out, elapsed
                
            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str:
                    wait_sec = 10 * attempt
                    print(f"\n   ⚠️ [Quota 429] Limite atteinte. Pause de {wait_sec}s avant tentative {attempt+1}/{max_retries}...")
                    time.sleep(wait_sec)
                else:
                    print(f"\n   ❌ Erreur API : {e}")
                    elapsed = time.perf_counter() - start_time
                    return "Erreur", elapsed
                    
        elapsed = time.perf_counter() - start_time
        return "Erreur (Quota dépassé)", elapsed

    # 5. Évaluation initiale sur 20 exemples
    print("\n--- TEST INITIAL SUR 20 EXEMPLES ---")
    subset_20 = df_sample.head(20)
    for idx, row in subset_20.iterrows():
        pred, lat = predict_one_with_retry(row["Consumer Claim"])
        print(f"[{idx+1:02d}] Vrai: {row['Tag_Clean']:<25} | Prédit: {pred:<25} ({lat:.2f}s)")
        time.sleep(0.1)

    # 6. Évaluation globale sur les 1 000 réclamations
    print(f"\n--- ÉVALUATION GLOBALE SUR {len(df_sample):,} EXEMPLES ---")
    predictions = []
    latencies = []
    
    start_total = time.time()
    for i, (idx, row) in enumerate(df_sample.iterrows()):
        pred, lat = predict_one_with_retry(row["Consumer Claim"])
        predictions.append(pred)
        latencies.append(lat)
        
        if (i + 1) % 25 == 0 or (i + 1) == len(df_sample):
            avg_lat = np.mean(latencies[-25:])
            print(f"Progrès : {i+1:4d}/{len(df_sample)} ({(i+1)/len(df_sample)*100:5.1f}%) | Latence moy: {avg_lat:.2f}s/req")
        time.sleep(0.05)
            
    total_duration = time.time() - start_total
    
    # 7. Nettoyage des prédictions et mapping vers catégories exactes
    def clean_pred(val):
        val_str = str(val).strip()
        for cat in categories:
            if cat.lower() in val_str.lower():
                return cat
        return "Autre / Inconnu"

    df_sample["LLM_Prediction_Raw"] = predictions
    df_sample["LLM_Prediction"] = df_sample["LLM_Prediction_Raw"].apply(clean_pred)
    df_sample["LLM_Latency_sec"] = latencies
    
    # Sauvegarde des résultats
    pred_path = os.path.join(output_dir, "llm_predictions.csv")
    df_sample.to_csv(pred_path, index=False)
    print(f"\nPrédictions et métriques sauvegardées dans : {pred_path}")

    # 8. Calcul des métriques
    y_true = df_sample["Tag_Clean"]
    y_pred = df_sample["LLM_Prediction"]
    
    acc = accuracy_score(y_true, y_pred)
    mean_lat = np.mean(latencies)
    median_lat = np.median(latencies)
    
    print("\n" + "=" * 60)
    print("RÉSULTATS DE L'ÉVALUATION DE L'APPROCHE LLM")
    print("=" * 60)
    print(f"Modèle évalué                   : {model_name}")
    print(f"Taille de l'échantillon de test  : {len(df_sample):,} réclamations")
    print(f"Durée totale de l'évaluation    : {total_duration/60:.2f} minutes")
    print(f"Accuracy globale                : {acc * 100:.2f}%")
    print(f"Temps de réponse moyen (Latence): {mean_lat:.3f} secondes / ticket")
    print(f"Temps de réponse médian         : {median_lat:.3f} secondes / ticket")
    
    print("\nRapport de classification détaillé :")
    report = classification_report(y_true, y_pred, zero_division=0)
    print(report)

    # 9. Matrice de Confusion
    labels_cm = sorted(list(set(y_true) | set(y_pred)))
    cm = confusion_matrix(y_true, y_pred, labels=labels_cm)
    
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Blues", xticklabels=labels_cm, yticklabels=labels_cm)
    plt.title(f"Matrice de Confusion - LLM ({model_name}) | Accuracy: {acc*100:.1f}%", fontsize=14, fontweight="bold")
    plt.xlabel("Prédiction LLM")
    plt.ylabel("Réalité (True Tag)")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    
    cm_path = os.path.join(output_dir, "llm_confusion_matrix.png")
    plt.savefig(cm_path, dpi=300)
    print(f"Matrice de confusion sauvegardée dans : {cm_path}")
    plt.close()
    
    print("=" * 60)
    print("ÉTAPE 2 TERMINÉE AVEC SUCCÈS !")
    print("=" * 60)

if __name__ == "__main__":
    run_llm_evaluation()
