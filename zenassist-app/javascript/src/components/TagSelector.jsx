'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import styles from './TagSelector.module.css';
import { ALLOWED_TAGS } from '@/constants/tags.js';
import { updateClaimTag, autoTagClaim } from '@/api-client.js';

export default function TagSelector({ claim, onTagUpdate }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [isAutoTagging, setIsAutoTagging] = useState(false);

    const handleTagSelect = async (tag) => {
        if (!claim) return;

        setIsUpdating(true);
        try {
            await updateClaimTag(claim.id, tag);
            toast.info(`Catégorie manuelle assignée : ${tag}`);
            onTagUpdate(claim.id, tag);
        } catch (error) {
            console.error('Error updating tag:', error);
            toast.error('Erreur lors de la mise à jour du tag');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleAutoTag = async () => {
        if (!claim || isAutoTagging) return;

        setIsAutoTagging(true);
        try {
            const result = await autoTagClaim(claim.id);
            if (result && result.tag) {
                toast.success(`Réclamation #${claim.id} classée !`, {
                    description: `Catégorie attribuée : ${result.tag}`,
                    duration: 4000,
                });
                onTagUpdate(claim.id, result.tag);
            }
        } catch (error) {
            console.error('Error auto-tagging claim with LLM:', error);
            toast.error(`Erreur sur la réclamation #${claim.id}`, {
                description: error.message || 'Impossible de classifier cette réclamation.',
            });
        } finally {
            setIsAutoTagging(false);
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
                    <h4>Assign tag</h4>

                    <div className={styles.tagSelector}>
                        <select
                            className={styles.select}
                            value={claim.tag ?? ''}
                            onChange={(e) => handleTagSelect(e.target.value)}
                            disabled={isUpdating || isAutoTagging}
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
                        <button
                            className={styles.autoTagAiButton}
                            onClick={handleAutoTag}
                            disabled={isUpdating || isAutoTagging}
                            aria-label="Auto-tag with Gemini AI"
                        >
                            {isAutoTagging ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    <span>Classification IA en cours...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨ Classifier automatiquement (Gemini LLM)</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
