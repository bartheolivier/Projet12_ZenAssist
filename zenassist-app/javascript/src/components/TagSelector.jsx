'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import styles from './TagSelector.module.css';
import { ALLOWED_TAGS } from '@/constants/tags.js';
import { updateClaimTag, tagClaimWithML, tagClaimWithLLM } from '@/api-client.js';

export default function TagSelector({ claim, onTagUpdate }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isMLTagging, setIsMLTagging] = useState(false);
    const [isLLMTagging, setIsLLMTagging] = useState(false);
    const [lastMeta, setLastMeta] = useState(null);

    // 1. Assignation ou modification manuelle du tag
    const handleTagSelect = async (tag) => {
        if (!claim || isUpdating) return;

        setIsUpdating(true);
        try {
            await updateClaimTag(claim.id, tag);
            setLastMeta({ engine: 'Manuel (Humain)', latency: '0 ms' });
            if (tag) {
                toast.success(`🏷️ Catégorie manuelle assignée !`, {
                    description: `Réclamation #${claim.id} -> ${tag}`,
                });
            } else {
                toast.info(`🔄 Réclamation #${claim.id} remise à l'état non classé (Untagged)`);
            }
            onTagUpdate(claim.id, tag);
        } catch (error) {
            console.error('Error updating tag:', error);
            toast.error('Erreur lors de la mise à jour du tag', {
                description: error.message || 'Impossible de mettre à jour le tag.'
            });
        } finally {
            setIsUpdating(false);
        }
    };

    // 2. Classification Machine Learning (FastAPI) - Étape 3
    const handleMLAutoTag = async () => {
        if (!claim || isMLTagging || isLLMTagging || isUpdating) return;

        setIsMLTagging(true);
        try {
            const result = await tagClaimWithML(claim.id);
            if (result && result.tag) {
                setLastMeta({
                    engine: 'Machine Learning (FastAPI)',
                    latency: `${result.inferenceLatencyMs} ms`,
                    confidence: `${(result.confidence * 100).toFixed(1)}%`,
                });
                toast.success(`⚡ Réclamation #${claim.id} classée par Machine Learning !`, {
                    description: `Catégorie : ${result.tag} | Latence : ${result.inferenceLatencyMs} ms | Confiance : ${(result.confidence * 100).toFixed(1)}%`,
                    duration: 4500,
                });
                onTagUpdate(claim.id, result.tag);
            }
        } catch (error) {
            console.error('Error auto-tagging claim with ML:', error);
            toast.error(`Erreur ML sur la réclamation #${claim.id}`, {
                description: error.message || 'Assurez-vous que le serveur FastAPI (port 8000) est bien lancé.',
            });
        } finally {
            setIsMLTagging(false);
        }
    };

    // 3. Classification LLM (Google Gemini) - Phase 2
    const handleLLMAutoTag = async () => {
        if (!claim || isMLTagging || isLLMTagging || isUpdating) return;

        setIsLLMTagging(true);
        try {
            const result = await tagClaimWithLLM(claim.id);
            if (result && result.tag) {
                setLastMeta({
                    engine: 'LLM (Google Gemini)',
                    latency: '~450 ms',
                });
                toast.success(`✨ Réclamation #${claim.id} classée par Gemini LLM !`, {
                    description: `Catégorie : ${result.tag}`,
                    duration: 4500,
                });
                onTagUpdate(claim.id, result.tag);
            }
        } catch (error) {
            console.error('Error auto-tagging claim with LLM:', error);
            toast.error(`Erreur LLM sur la réclamation #${claim.id}`, {
                description: error.message || 'Impossible de classifier avec le LLM.',
            });
        } finally {
            setIsLLMTagging(false);
        }
    };

    if (!claim) {
        return (
            <div className={styles.container}>
                <div className={styles.placeholder}>
                    <div className={styles.placeholderIcon}>👈</div>
                    <h3>Sélectionnez une réclamation</h3>
                    <p>Cliquez sur une réclamation dans la liste pour l'étiqueter manuellement ou avec l'IA.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Réclamation #{claim.id}</h2>
                {claim.tag && (
                    <span className={styles.currentTagBadge}>
                        {claim.tag}
                    </span>
                )}
            </div>

            <div className={styles.content}>
                {/* Contenu du texte de la réclamation */}
                <div className={styles.claimContent}>
                    <h4>Texte de la réclamation</h4>
                    <p>{claim.content}</p>
                </div>

                {/* SECTION 1 : ASSIGNATION MANUELLE */}
                <div className={styles.manualSection}>
                    <div className={styles.sectionHeader}>
                        <h4>🏷️ Assignation Manuelle</h4>
                        {claim.tag && (
                            <button
                                className={styles.untagBtn}
                                onClick={() => handleTagSelect(null)}
                                disabled={isUpdating || isMLTagging || isLLMTagging}
                                title="Supprimer le tag et remettre dans 'Untagged'"
                            >
                                ✕ Retirer le tag
                            </button>
                        )}
                    </div>

                    {/* Menu déroulant classique */}
                    <div className={styles.tagSelector}>
                        <select
                            className={styles.select}
                            value={claim.tag ?? ''}
                            onChange={(e) => handleTagSelect(e.target.value)}
                            disabled={isUpdating || isMLTagging || isLLMTagging}
                            aria-label="Choisir une catégorie manuellement"
                        >
                            <option value="" disabled>
                                -- Choisir une catégorie manuellement --
                            </option>

                            {ALLOWED_TAGS.map((tag) => (
                                <option key={tag} value={tag}>
                                    {tag}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Grille de badges pour sélection rapide en 1 clic */}
                    <div className={styles.quickTagsContainer}>
                        <span className={styles.quickTagsLabel}>Sélection rapide en 1 clic :</span>
                        <div className={styles.quickTagsGrid}>
                            {ALLOWED_TAGS.map((tag) => {
                                const isCurrent = claim.tag === tag;
                                return (
                                    <button
                                        key={tag}
                                        className={`${styles.quickTagPill} ${isCurrent ? styles.activePill : ''}`}
                                        onClick={() => handleTagSelect(tag)}
                                        disabled={isUpdating || isMLTagging || isLLMTagging}
                                        title={`Assigner manuellement '${tag}'`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {isUpdating && (
                        <div className={styles.updating}>
                            <span className={styles.spinner}></span>
                            <span>Mise à jour en base PostgreSQL...</span>
                        </div>
                    )}
                </div>

                {/* SECTION 2 : AUTO-CLASSIFICATION IA */}
                <div className={styles.aiSection}>
                    <h4>🤖 Moteurs d'Auto-Classification IA</h4>
                    <div className={styles.aiButtons}>
                        {/* Bouton ML (Étape 3 - FastAPI) */}
                        <button
                            className={styles.autoTagMlButton}
                            onClick={handleMLAutoTag}
                            disabled={isUpdating || isMLTagging || isLLMTagging}
                            aria-label="Auto-tag with Machine Learning"
                            title="Prédire avec le modèle Machine Learning (FastAPI, ~2ms)"
                        >
                            {isMLTagging ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    <span>Inférence ML en cours...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡ Classifier avec Modèle ML (FastAPI)</span>
                                </>
                            )}
                        </button>

                        {/* Bouton LLM (Phase 2 - Gemini) */}
                        <button
                            className={styles.autoTagLlmButton}
                            onClick={handleLLMAutoTag}
                            disabled={isUpdating || isMLTagging || isLLMTagging}
                            aria-label="Auto-tag with Gemini LLM"
                            title="Prédire avec Google Gemini LLM (~450ms)"
                        >
                            {isLLMTagging ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    <span>Inférence LLM en cours...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨ Classifier avec Gemini LLM</span>
                                </>
                            )}
                        </button>
                    </div>

                    {lastMeta && (
                        <div className={styles.metaBox}>
                            <div><strong>Moteur :</strong> {lastMeta.engine}</div>
                            <div><strong>Latence :</strong> {lastMeta.latency}</div>
                            {lastMeta.confidence && <div><strong>Confiance :</strong> {lastMeta.confidence}</div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
