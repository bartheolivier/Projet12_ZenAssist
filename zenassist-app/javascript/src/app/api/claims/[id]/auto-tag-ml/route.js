import { NextResponse } from 'next/server';
import { getClaimById, setClaimTag } from '@/database/queries.js';

export const dynamic = 'force-dynamic';

const ML_API_URL = process.env.ML_API_URL || 'http://localhost:8000';

export async function POST(request, { params }) {
  try {
    const resolvedParams = await params;
    const claimId = parseInt(resolvedParams.id);

    if (isNaN(claimId)) {
      return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
    }

    const claim = await getClaimById(claimId);
    if (!claim) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    // Appel à l'API Python FastAPI (route POST /tags)
    const startTime = performance.now();
    let mlResponse;
    try {
      mlResponse = await fetch(`${ML_API_URL}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_claim: claim.content,
        }),
      });
    } catch (fetchErr) {
      console.error('Impossible de joindre le serveur FastAPI:', fetchErr);
      return NextResponse.json(
        {
          error: `Le serveur FastAPI (port 8000) n'est pas accessible (${fetchErr.message}). Lancez ./zenassist-app/start_app.sh pour démarrer l'API Python.`
        },
        { status: 503 }
      );
    }

    if (!mlResponse.ok) {
      const errData = await mlResponse.json().catch(() => ({}));
      throw new Error(errData.detail || `FastAPI error with status ${mlResponse.status}`);
    }

    const mlResult = await mlResponse.json();
    const totalLatencyMs = performance.now() - startTime;

    // Mise à jour de la base de données PostgreSQL de l'application
    await setClaimTag(claimId, mlResult.tag);

    return NextResponse.json({
      success: true,
      claimId,
      tag: mlResult.tag,
      confidence: mlResult.confidence,
      inferenceLatencyMs: mlResult.latency_ms,
      totalLatencyMs: Math.round(totalLatencyMs * 100) / 100,
      engine: 'Machine Learning (FastAPI)',
    });
  } catch (error) {
    console.error('Error in ML auto-tag route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to classify claim with ML model' },
      { status: 500 }
    );
  }
}
