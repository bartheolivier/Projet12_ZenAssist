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

    // 1. Mise à jour manuelle
    const handleTagSelect = async (tag) => {
        if (!claim) return;

        setIsUpdating(true);
        try {
            await updateClaimTag(claim.id, tag);
            setLastMeta({ engine: 'Manuel', latency: '-' });
            toast.info(`Catégorie manuelle assignée : ${tag}`);
            onTagUpdate(claim.id, tag);
        } catch (error) {
            console.error('Error updating tag:', error);
            toast.error('Erreur lors de la mise à jour du tag');
        } finally {
            setIsUpdating(false);
        }
    };

    // 2. Classification Machine Learning (FastAPI) - Étape 3
    const handleMLAutoTag = async () => {
        if (!claim || isMLTagging || isLLMTagging) return;

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
        if (!claim || isMLTagging || isLLMTagging) return;

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
                    <h3>Select a claim to assign tags</h3>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2>Claim #{claim.id}</h2>
            </div>

            <div className={styles.content}>
                <div className={styles.claimContent}>
                    <h3>Content</h3>
                    <p>{claim.content}</p>
                </div>

                <div className={styles.tagSection}>
                    <h4>Assign tag (Manual)</h4>

                    <div className={styles.tagSelector}>
                        <select
                            className={styles.select}
                            value={claim.tag ?? ''}
                            onChange={(e) => handleTagSelect(e.target.value)}
                            disabled={isUpdating || isMLTagging || isLLMTagging}
                        >
                            <option value="" disabled>
                                Select a tag
                            </option>

                            {ALLOWED_TAGS.map((tag) => (
                                <option key={tag} value={tag}>
                                    {tag}
                                </option>
                            ))}
                        </select>

                        {(!claim.tag || claim.tag === '') && (
                            <svg
                                className={styles.chevronIcon}
                                width="12"
                                height="12"
                                viewBox="0 0 292.4 292.4"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    fill="var(--foreground-muted)"
                                    d="M287 69.4a17.6 17.6 0 0 0-13-5.4H18.4c-5 0-9.3 1.8-12.9 5.4A17.6 17.6 0 0 0 0 82.2c0 5 1.8 9.3 5.4 12.9l128 127.9c3.6 3.6 7.8 5.4 12.8 5.4s9.2-1.8 12.8-5.4L287 95c3.5-3.5 5.4-7.8 5.4-12.8 0-5-1.9-9.2-5.5-12.8z"
                                />
                            </svg>
                        )}

                        {isUpdating && (
                            <div className={styles.updating}>
                                Updating...
                            </div>
                        )}
                    </div>

                    <div className={styles.aiSection}>
                        <h4>AI Auto-Tagging Engines</h4>
                        <div className={styles.aiButtons}>
                            {/* Bouton ML (Étape 3) */}
                            <button
                                className={styles.autoTagMlButton}
                                onClick={handleMLAutoTag}
                                disabled={isUpdating || isMLTagging || isLLMTagging}
                                aria-label="Auto-tag with Machine Learning"
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

                            {/* Bouton LLM (Phase 2) */}
                            <button
                                className={styles.autoTagLlmButton}
                                onClick={handleLLMAutoTag}
                                disabled={isUpdating || isMLTagging || isLLMTagging}
                                aria-label="Auto-tag with Gemini LLM"
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
        </div>
    );
}
