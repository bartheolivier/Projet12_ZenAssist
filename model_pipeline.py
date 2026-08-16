class ZenAssistModelPipeline:
    """
    Pipeline unifié de prédiction pour ZenAssist.
    Encapsule le Vectoriseur TF-IDF, le classifieur Logistic Regression et le LabelEncoder.
    """
    def __init__(self, vectorizer, classifier, label_encoder):
        self.vectorizer = vectorizer
        self.classifier = classifier
        self.label_encoder = label_encoder
        self.classes_ = list(label_encoder.classes_)

    def predict(self, texts):
        """Prend une liste ou un texte unique et retourne la catégorie prédite."""
        if isinstance(texts, str):
            texts = [texts]
        X_tfidf = self.vectorizer.transform(texts)
        y_pred = self.classifier.predict(X_tfidf)
        return self.label_encoder.inverse_transform(y_pred)

    def predict_proba(self, texts):
        """Retourne les probabilités pour chaque classe."""
        if isinstance(texts, str):
            texts = [texts]
        X_tfidf = self.vectorizer.transform(texts)
        return self.classifier.predict_proba(X_tfidf)
