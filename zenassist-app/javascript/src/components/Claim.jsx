'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import styles from './Claim.module.css';
import { autoTagClaim } from '@/api-client.js';

export default function ClaimComponent({ claim, isSelected, onClick, onTagClick, onTagUpdate }) {
    const [isAutoTagging, setIsAutoTagging] = useState(false);

    const handleTagClick = (e) => {
        e.stopPropagation();

        if (claim.tag && onTagClick) {
            onTagClick(claim.tag);
        }
    };

    const handleAutoTagClick = async (e) => {
        e.stopPropagation();
        if (isAutoTagging) return;

        setIsAutoTagging(true);
        try {
            const result = await autoTagClaim(claim.id);
            if (result && result.tag) {
                toast.success(`Réclamation #${claim.id} classée !`, {
                    description: `Catégorie attribuée : ${result.tag}`,
                    duration: 4000,
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
            toast.error(`Erreur sur la réclamation #${claim.id}`, {
                description: error.message || 'Impossible de classifier cette réclamation.',
            });
        } finally {
            setIsAutoTagging(false);
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
                        <button
                            className={styles.tag}
                            onClick={handleTagClick}
                            aria-label={`Navigate to ${claim.tag} inbox`}
                            title={`Go to ${claim.tag} inbox`}
                        >
                            {claim.tag}
                        </button>
                    ) : (
                        <button
                            className={`${styles.autoTagBtn} ${isAutoTagging ? styles.loading : ''}`}
                            onClick={handleAutoTagClick}
                            disabled={isAutoTagging}
                            aria-label="Auto-tag with AI"
                            title="Auto-tag this claim using Gemini LLM"
                        >
                            {isAutoTagging ? (
                                <>
                                    <span className={styles.spinner}></span>
                                    <span>IA en cours...</span>
                                </>
                            ) : (
                                <>
                                    <span>✨ Auto-tag IA</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
