// Removed Claim type import as it's not needed in JavaScript

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

export async function autoTagClaim(claimId) {
  const response = await fetch(`${BASE_URL}/${claimId}/auto-tag`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to auto-tag claim with LLM');
  }

  return response.json();
}

