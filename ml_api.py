import os
import sys
import time
import pickle
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import de la classe de pipeline pour la désérialisation pickle
from model_pipeline import ZenAssistModelPipeline



# 1. Définition des schémas de données (Pydantic)
class ClaimRequest(BaseModel):
    """Schéma de la requête attendue par la consigne OpenClassrooms."""
    user_claim: str = Field(
        ...,
        min_length=3,
        description="Texte de la réclamation client",
        json_schema_extra={"example": "I was charged an unexpected fee on my credit card statement."}
    )

class PredictionResponse(BaseModel):
    """Schéma de la réponse retournée par l'API."""
    tag: str = Field(..., description="Catégorie produit prédite par le modèle de Machine Learning")
    confidence: float = Field(..., description="Score de confiance / probabilité de la prédiction (entre 0 et 1)")
    latency_ms: float = Field(..., description="Temps de calcul de l'inférence en millisecondes")

# Variable globale pour stocker le modèle en mémoire
model_pipeline = None

# 2. Cycle de vie de l'application (Chargement du modèle au démarrage)
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Charge le modèle sérialisé au démarrage du serveur FastAPI."""
    global model_pipeline
    
    # Chemins possibles pour model.pkl
    possible_paths = [
        "release_artifacts/model.pkl",
        "model.pkl",
        "dataset/best_ml_model.joblib"
    ]
    
    model_path = None
    for path in possible_paths:
        if os.path.exists(path):
            model_path = path
            break
            
    if not model_path:
        print(f"⚠️ [AVERTISSEMENT] Aucun fichier de modèle trouvé ! Exécution de export_model.py...")
        from export_model import export_model_and_metrics
        export_model_and_metrics()
        model_path = "release_artifacts/model.pkl"

    print(f"🚀 Chargement du modèle de classification depuis : {model_path}...")
    try:
        with open(model_path, "rb") as f:
            model_pipeline = pickle.load(f)
        print(f"✅ Modèle ML chargé avec succès ! Catégories gérées ({len(model_pipeline.classes_)}) : {model_pipeline.classes_}")
    except Exception as e:
        print(f"❌ Erreur critique lors du chargement du modèle : {e}")
        raise e

    yield  # Le serveur tourne et traite les requêtes ici
    
    print("🛑 Arrêt du serveur FastAPI et libération des ressources.")

# 3. Initialisation de l'application FastAPI
app = FastAPI(
    title="ZenAssist - API de Classification ML des Réclamations",
    description="API REST haute performance (FastAPI) pour l'inférence du modèle de classification supervisée ZenAssist.",
    version="1.0.0",
    lifespan=lifespan
)

# 4. Configuration CORS (pour permettre les requêtes depuis Next.js sur localhost:3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En développement, autorise toutes les origines (notamment http://localhost:3000)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. Routes de l'API

@app.get("/", tags=["Santé & Infos"])
async def root():
    """Route racine fournissant l'état du service et le lien vers la documentation Swagger."""
    return {
        "service": "ZenAssist ML Classification API",
        "status": "online",
        "version": "1.0.0",
        "model_loaded": model_pipeline is not None,
        "docs_url": "/docs"
    }

@app.get("/health", tags=["Santé & Infos"])
async def health_check():
    """Vérification de l'état de santé de l'API."""
    if model_pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Le modèle ML n'est pas encore initialisé."
        )
    return {"status": "healthy", "classes_count": len(model_pipeline.classes_)}

@app.post(
    "/tags",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Classifier une réclamation client",
    description="Reçoit le texte d'une réclamation ('user_claim') et retourne la catégorie produit prédite par le modèle de Machine Learning.",
    tags=["Prédiction ML"]
)
async def predict_claim_tag(request: ClaimRequest):
    """
    Route principale demandée par la consigne OpenClassrooms :
    POST /tags avec body {"user_claim": "..."}
    """
    if model_pipeline is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Modèle de classification non chargé."
        )
    
    text = request.user_claim.strip()
    if not text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le champ 'user_claim' ne peut pas être vide."
        )
    
    # Mesure de la latence d'inférence ultra-rapide
    start_time = time.perf_counter()
    
    try:
        # Prédiction de la catégorie
        predicted_tag = model_pipeline.predict(text)[0]
        
        # Calcul de la probabilité / score de confiance
        proba = model_pipeline.predict_proba(text)[0]
        class_idx = list(model_pipeline.classes_).index(predicted_tag)
        confidence = float(proba[class_idx])
        
        latency_ms = (time.perf_counter() - start_time) * 1000
        
        return PredictionResponse(
            tag=predicted_tag,
            confidence=round(confidence, 4),
            latency_ms=round(latency_ms, 3)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'inférence du modèle : {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    # Permet d'exécuter directement avec : python ml_api.py
    uvicorn.run("ml_api:app", host="0.0.0.0", port=8000, reload=True)
