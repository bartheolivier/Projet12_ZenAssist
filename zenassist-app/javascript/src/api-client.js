// API Client pour ZenAssist (Support Double Moteur : ML FastAPI & LLM Gemini)

const BASE_URL = '/api/claims';

export async function fetchClaims(tag) {
  const url = tag
    ? `${BASE_URL}?tag=${encodeURIComponent(tag)}`
    : BASE_URL;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch claims', { cause: response });
  }

  return response.json();
}

export async function updateClaimTag(claimId, tag) {
  const response = await fetch(`${BASE_URL}/${claimId}/tag`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tag }),
  });

  if (!response.ok) {
    throw new Error('Failed to update tag');
  }
}

// 1. Approche Machine Learning (Étape 3 - Route FastAPI)
export async function tagClaimWithML(claimId) {
  const response = await fetch(`${BASE_URL}/${claimId}/auto-tag-ml`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to auto-tag claim with ML model');
  }

  return response.json();
}

// 2. Approche LLM (Phase 2 - Route Gemini)
export async function tagClaimWithLLM(claimId) {
  const response = await fetch(`${BASE_URL}/${claimId}/auto-tag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to auto-tag claim with LLM');
  }

  return response.json();
}

// Alias par défaut (pointe vers le Machine Learning pour la Phase 3)
export const autoTagClaim = tagClaimWithML;
