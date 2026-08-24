'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import styles from './Claim.module.css';
import { tagClaimWithML, tagClaimWithLLM } from '@/api-client.js';

export default function ClaimComponent({ claim, isSelected, onClick, onTagClick, onTagUpdate }) {
    const [isMLTagging, setIsMLTagging] = useState(false);
    const [isLLMTagging, setIsLLMTagging] = useState(false);

    const handleTagClick = (e) => {
        e.stopPropagation();

        if (claim.tag && onTagClick) {
            onTagClick(claim.tag);
        }
    };

    // 1. Classification via Machine Learning (FastAPI) - Étape 3
    const handleMLTagClick = async (e) => {
        e.stopPropagation();
        if (isMLTagging || isLLMTagging) return;

        setIsMLTagging(true);
        try {
            const result = await tagClaimWithML(claim.id);
            if (result && result.tag) {
                toast.success(`⚡ Réclamation #${claim.id} classée par Machine Learning !`, {
                    description: `Catégorie : ${result.tag} | Latence : ${result.inferenceLatencyMs} ms | Confiance : ${(result.confidence * 100).toFixed(1)}%`,
                    duration: 4500,
                    action: onTagClick ? {
                        label: 'Voir la boîte',
                        onClick: () => onTagClick(result.tag),
                    } : undefined,
                });
                if (onTagUpdate) {
                    onTagUpdate(claim.id, result.tag);
                }
            }
        } catch (error) {
            console.error('Failed to auto-tag claim with ML:', error);
            toast.error(`Erreur ML sur la réclamation #${claim.id}`, {
                description: error.message || 'Assurez-vous que le serveur FastAPI (port 8000) est bien lancé.',
            });
        } finally {
            setIsMLTagging(false);
        }
    };

    // 2. Classification via LLM (Google Gemini) - Phase 2
    const handleLLMTagClick = async (e) => {
        e.stopPropagation();
        if (isMLTagging || isLLMTagging) return;

        setIsLLMTagging(true);
        try {
            const result = await tagClaimWithLLM(claim.id);
            if (result && result.tag) {
                toast.success(`✨ Réclamation #${claim.id} classée par Gemini LLM !`, {
                    description: `Catégorie : ${result.tag}`,
                    duration: 4500,
                    action: onTagClick ? {
                        label: 'Voir la boîte',
                        onClick: () => onTagClick(result.tag),
                    } : undefined,
                });
                if (onTagUpdate) {
                    onTagUpdate(claim.id, result.tag);
                }
            }
        } catch (error) {
            console.error('Failed to auto-tag claim with LLM:', error);
            toast.error(`Erreur LLM sur la réclamation #${claim.id}`, {
                description: error.message || 'Impossible de classifier avec le LLM.',
            });
        } finally {
            setIsLLMTagging(false);
        }
    };

    return (
        <div
            className={`${styles.container} ${isSelected ? styles.selected : ''}`}
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
        >
            <div className={styles.content}>
                <p
                    className={styles.text}
                    id={`claim-content-${claim.id}`}
                >
                    {claim.content}
                </p>
                <div className={styles.actionsRow}>
                    {claim.tag ? (
                        <div className={styles.taggedRow}>
                            <button
                                className={styles.tag}
                                onClick={handleTagClick}
                                aria-label={`Navigate to ${claim.tag} inbox`}
                                title={`Aller à la boîte ${claim.tag}`}
                            >
                                {claim.tag}
                            </button>
                        </div>
                    ) : (
                        <div className={styles.buttonGroup}>
                            {/* Bouton Option 1 : Assignation Manuelle */}
                            <button
                                className={styles.manualTagBtn}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onClick) onClick();
                                }}
                                title="Ouvrir le panneau pour choisir manuellement la catégorie"
                                aria-label="Manual Tagging"
                            >
                                <span>🏷️ Manuel</span>
                            </button>

                            {/* Bouton Option 2 : Machine Learning (FastAPI - Étape 3) */}
                            <button
                                className={`${styles.autoTagMlBtn} ${isMLTagging ? styles.loading : ''}`}
                                onClick={handleMLTagClick}
                                disabled={isMLTagging || isLLMTagging}
                                aria-label="Auto-tag with Machine Learning"
                                title="Classifier avec le modèle ML (FastAPI ~2ms)"
                            >
                                {isMLTagging ? (
                                    <>
                                        <span className={styles.spinner}></span>
                                        <span>ML...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>⚡ ML</span>
                                    </>
                                )}
                            </button>

                            {/* Bouton Option 3 : LLM (Gemini - Phase 2) */}
                            <button
                                className={`${styles.autoTagLlmBtn} ${isLLMTagging ? styles.loading : ''}`}
                                onClick={handleLLMTagClick}
                                disabled={isMLTagging || isLLMTagging}
                                aria-label="Auto-tag with Gemini LLM"
                                title="Classifier avec Google Gemini LLM"
                            >
                                {isLLMTagging ? (
                                    <>
                                        <span className={styles.spinner}></span>
                                        <span>LLM...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>✨ LLM</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
