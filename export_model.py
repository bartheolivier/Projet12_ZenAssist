import os
import sys
import json
import time
import pickle
import joblib
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer, ENGLISH_STOP_WORDS
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, classification_report
from model_pipeline import ZenAssistModelPipeline


def export_model_and_metrics(output_dir="release_artifacts", sample_path="dataset/llm_test_sample.csv"):
    os.makedirs(output_dir, exist_ok=True)
    print("=" * 60)
    print("EXPORT DU MODÈLE ET GÉNÉRATION DES MÉTRIQUES (PICKLE & JSON)")
    print("=" * 60)

    # 1. Vérifier si les modèles pré-entraînés existent ou les charger
    train_path = "dataset/processed_train.csv"
    
    if os.path.exists("dataset/best_ml_model.joblib") and os.path.exists("dataset/tfidf_vectorizer.joblib") and os.path.exists("dataset/label_encoder.joblib"):
        print("-> Chargement des composants pré-entraînés existants...")
        classifier = joblib.load("dataset/best_ml_model.joblib")
        vectorizer = joblib.load("dataset/tfidf_vectorizer.joblib")
        label_encoder = joblib.load("dataset/label_encoder.joblib")
    elif os.path.exists(train_path):
        print("-> Entraînement du modèle sur le jeu complet...")
        df_train = pd.read_csv(train_path)
        label_encoder = LabelEncoder()
        y_train = label_encoder.fit_transform(df_train["Tag_Clean"])
        
        custom_stop_words = list(ENGLISH_STOP_WORDS) + ['xxxx', 'xx', 'xxxxxx', 'x', '00', 'xxxxxxxx']
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=50000, sublinear_tf=True, stop_words=custom_stop_words)
        X_train = vectorizer.fit_transform(df_train["Consumer Claim"].astype(str).fillna(""))
        
        classifier = LogisticRegression(C=1.0, max_iter=500, random_state=42)
        classifier.fit(X_train, y_train)
    else:
        print("-> Entraînement rapide sur l'échantillon disponible...")
        df_sample = pd.read_csv(sample_path)
        label_encoder = LabelEncoder()
        y_train = label_encoder.fit_transform(df_sample["Tag_Clean"])
        
        custom_stop_words = list(ENGLISH_STOP_WORDS) + ['xxxx', 'xx', 'xxxxxx', 'x', '00', 'xxxxxxxx']
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), max_features=10000, sublinear_tf=True, stop_words=custom_stop_words)
        X_train = vectorizer.fit_transform(df_sample["Consumer Claim"].astype(str).fillna(""))
        
        classifier = LogisticRegression(C=1.0, max_iter=500, random_state=42)
        classifier.fit(X_train, y_train)

    # 2. Création du pipeline unifié
    pipeline = ZenAssistModelPipeline(vectorizer, classifier, label_encoder)
    
    # 3. Export au format Pickle (.pkl)
    model_pkl_path = os.path.join(output_dir, "model.pkl")
    with open(model_pkl_path, "wb") as f:
        pickle.dump(pipeline, f, protocol=pickle.HIGHEST_PROTOCOL)
    
    file_size_mb = os.path.getsize(model_pkl_path) / (1024 * 1024)
    print(f"-> Modèle exporté au format Pickle : {model_pkl_path} ({file_size_mb:.2f} Mo)")

    # 4. Évaluation sur l'échantillon de test (1 000 tickets) pour le JSON des métriques
    df_eval = pd.read_csv(sample_path)
    X_eval = df_eval["Consumer Claim"].astype(str).fillna("").tolist()
    y_true = df_eval["Tag_Clean"].tolist()

    start_eval = time.perf_counter()
    y_pred = pipeline.predict(X_eval)
    eval_duration = time.perf_counter() - start_eval
    latency_ms = (eval_duration / len(X_eval)) * 1000

    acc = accuracy_score(y_true, y_pred)
    f1_weighted = f1_score(y_true, y_pred, average="weighted")
    report_dict = classification_report(y_true, y_pred, output_dict=True, zero_division=0)

    # 5. Génération du fichier metrics.json
    metrics = {
        "model_name": "ZenAssist Logistic Regression Classifier",
        "algorithm": "Logistic Regression + TF-IDF (1-2 ngrams)",
        "framework": "scikit-learn",
        "export_format": "pickle",
        "timestamp_utc": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime()),
        "evaluation_sample_size": len(X_eval),
        "metrics": {
            "accuracy": round(acc, 4),
            "accuracy_percent": f"{acc * 100:.2f}%",
            "f1_score_weighted": round(f1_weighted, 4),
            "inference_latency_ms_per_ticket": round(latency_ms, 4),
            "inference_latency_sec_per_ticket": round(latency_ms / 1000, 6)
        },
        "target_classes": pipeline.classes_,
        "classification_report": report_dict
    }

    metrics_json_path = os.path.join(output_dir, "metrics.json")
    with open(metrics_json_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, ensure_ascii=False)

    print(f"-> Métriques exportées au format JSON : {metrics_json_path}")
    print(f"   * Accuracy : {acc * 100:.2f}%")
    print(f"   * F1 Weighted : {f1_weighted:.4f}")
    print(f"   * Latence d'inférence : {latency_ms:.4f} ms/ticket")
    print("=" * 60)

if __name__ == "__main__":
    export_model_and_metrics()
