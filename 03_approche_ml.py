import os
import sys
import time
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, f1_score

def run_ml_evaluation(train_path="dataset/processed_train.csv", 
                       test_path="dataset/processed_test.csv",
                       llm_sample_path="dataset/llm_test_sample.csv",
                       output_dir="dataset"):
    print("=" * 60)
    print("ÉTAPE 3 : ÉVALUATION DE L'APPROCHE MACHINE LEARNING TRADITIONNEL")
    print("=" * 60)
    
    # 1. Chargement des datasets
    print("1. Chargement des jeux de données...")
    df_train = pd.read_csv(train_path)
    df_test = pd.read_csv(test_path)
    df_llm_sample = pd.read_csv(llm_sample_path)
    
    print(f"   - Jeu d'entraînement (Train) : {len(df_train):,} exemples")
    print(f"   - Jeu de test complet (Test)  : {len(df_test):,} exemples")
    print(f"   - Échantillon test LLM        : {len(df_llm_sample):,} exemples")
    
    # Nettoyage des chaînes
    X_train_raw = df_train["Consumer Claim"].astype(str).fillna("")
    y_train_raw = df_train["Tag_Clean"]
    
    X_test_raw = df_test["Consumer Claim"].astype(str).fillna("")
    y_test_raw = df_test["Tag_Clean"]
    
    X_llm_raw = df_llm_sample["Consumer Claim"].astype(str).fillna("")
    y_llm_raw = df_llm_sample["Tag_Clean"]
    
    # 2. Encodage des étiquettes (LabelEncoder)
    print("\n2. Encodage des étiquettes...")
    label_encoder = LabelEncoder()
    y_train = label_encoder.fit_transform(y_train_raw)
    y_test = label_encoder.transform(y_test_raw)
    y_llm = label_encoder.transform(y_llm_raw)
    
    categories = list(label_encoder.classes_)
    print(f"   - Catégories ({len(categories)}) : {categories}")
    
    # 3. Vectorisation TF-IDF
    print("\n3. Vectorisation TF-IDF (Unigrammes + Bigrammes, max 50 000 features)...")
    start_vec = time.time()
    vectorizer = TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=50000,
        sublinear_tf=True,
        stop_words="english"
    )
    
    X_train_tfidf = vectorizer.fit_transform(X_train_raw)
    X_test_tfidf = vectorizer.transform(X_test_raw)
    X_llm_tfidf = vectorizer.transform(X_llm_raw)
    
    duration_vec = time.time() - start_vec
    print(f"   - Vectorisation terminée en {duration_vec:.2f} s. Dimension : {X_train_tfidf.shape}")

    # 4. Modèles de Machine Learning à comparer
    models = {
        "Logistic Regression": LogisticRegression(C=1.0, max_iter=500, n_jobs=-1, random_state=42),
        "Multinomial Naive Bayes": MultinomialNB(alpha=0.1),
        "Linear SVM (SGD)": SGDClassifier(loss="log_loss", penalty="l2", max_iter=500, random_state=42, n_jobs=-1)
    }
    
    results = []
    best_model = None
    best_model_name = ""
    best_f1 = 0.0
    best_y_pred_llm = None
    
    # 5. Entraînement et Évaluation des Modèles
    print("\n4. Entraînement et Évaluation des Modèles...")
    print("-" * 75)
    
    for name, model in models.items():
        print(f"\n---> Modèle : {name}")
        start_train = time.time()
        model.fit(X_train_tfidf, y_train)
        train_time = time.time() - start_train
        print(f"     * Temps d'entraînement : {train_time:.2f} s")
        
        # Mesure de la latence d'inférence sur le sous-échantillon de 1,000 réclamations
        start_inf = time.perf_counter()
        y_pred_llm = model.predict(X_llm_tfidf)
        inf_duration = time.perf_counter() - start_inf
        latency_per_sample_ms = (inf_duration / len(X_llm_raw)) * 1000  # en ms
        
        # Métriques sur le sous-échantillon LLM (pour comparaison directe à iso-périmètre)
        acc_llm = accuracy_score(y_llm, y_pred_llm)
        f1_llm_macro = f1_score(y_llm, y_pred_llm, average="macro")
        f1_llm_weighted = f1_score(y_llm, y_pred_llm, average="weighted")
        
        # Métriques sur le Test Set complet (73 425 exemples)
        y_pred_full = model.predict(X_test_tfidf)
        acc_full = accuracy_score(y_test, y_pred_full)
        f1_full_weighted = f1_score(y_test, y_pred_full, average="weighted")
        
        print(f"     * Accuracy (1 000 sample LLM)  : {acc_llm * 100:.2f}%")
        print(f"     * F1-score Weighted (1 000)   : {f1_llm_weighted:.4f}")
        print(f"     * Accuracy (73 425 test set)  : {acc_full * 100:.2f}%")
        print(f"     * Latence d'inférence/ticket  : {latency_per_sample_ms:.3f} ms ({latency_per_sample_ms/1000:.6f} s)")
        
        results.append({
            "Modèle": name,
            "Accuracy (1k LLM)": f"{acc_llm*100:.2f}%",
            "F1-Weighted (1k)": round(f1_llm_weighted, 4),
            "Accuracy (73k Test)": f"{acc_full*100:.2f}%",
            "F1-Weighted (73k)": round(f1_full_weighted, 4),
            "Temps Entraînement (s)": round(train_time, 2),
            "Latence / ticket (ms)": round(latency_per_sample_ms, 3)
        })
        
        if f1_llm_weighted > best_f1:
            best_f1 = f1_llm_weighted
            best_model = model
            best_model_name = name
            best_y_pred_llm = y_pred_llm

    # 6. Tableau Récapitulatif
    df_res = pd.DataFrame(results)
    print("\n" + "=" * 75)
    print(" TABLEAU COMPARATIF DES MODÈLES DE MACHINE LEARNING")
    print("=" * 75)
    print(df_res.to_string(index=False))
    
    # Sauvegarde des métriques ML
    df_res.to_csv(os.path.join(output_dir, "ml_comparison_metrics.csv"), index=False)

    # 7. Rapport détaillé et Matrice de Confusion pour le Meilleur Modèle ML
    print("\n" + "=" * 75)
    print(f" MEILLEUR MODÈLE ML : {best_model_name}")
    print("=" * 75)
    
    y_llm_names = label_encoder.inverse_transform(y_llm)
    y_pred_names = label_encoder.inverse_transform(best_y_pred_llm)
    
    print(classification_report(y_llm_names, y_pred_names, zero_division=0))
    
    cm = confusion_matrix(y_llm_names, y_pred_names, labels=categories)
    plt.figure(figsize=(12, 10))
    sns.heatmap(cm, annot=True, fmt="d", cmap="Greens", xticklabels=categories, yticklabels=categories)
    plt.title(f"Matrice de Confusion - ML ({best_model_name}) | Accuracy: {accuracy_score(y_llm, best_y_pred_llm)*100:.1f}%", fontsize=14, fontweight="bold")
    plt.xlabel("Prédiction Machine Learning")
    plt.ylabel("Réalité (True Tag)")
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    
    cm_path = os.path.join(output_dir, "ml_confusion_matrix.png")
    plt.savefig(cm_path, dpi=300)
    print(f"Matrice de confusion sauvegardée dans : {cm_path}")
    plt.close()
    
    # 8. Sauvegarde du modèle et du vectoriseur
    joblib.dump(best_model, os.path.join(output_dir, "best_ml_model.joblib"))
    joblib.dump(vectorizer, os.path.join(output_dir, "tfidf_vectorizer.joblib"))
    joblib.dump(label_encoder, os.path.join(output_dir, "label_encoder.joblib"))
    
    print("\n" + "=" * 60)
    print("ÉTAPE 3 TERMINÉE AVEC SUCCÈS !")
    print("=" * 60)

if __name__ == "__main__":
    run_ml_evaluation()
