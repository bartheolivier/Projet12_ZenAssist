import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getClaimById, setClaimTag } from '@/database/queries.js';
import { ALLOWED_TAGS } from '@/constants/tags.js';

const apiKey = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

const ai = new GoogleGenAI({ apiKey });

const PROMPT_SYSTEM = `Tu es un expert en classification automatique de réclamations de services financiers chez ZenAssist.
Ta mission est d'analyser le texte de la réclamation d'un client et de la classer dans EXACTEMENT UNE des catégories suivantes :

Catégories autorisées :
${ALLOWED_TAGS.map((tag, index) => `${index + 1}. ${tag}`).join('\n')}

Règles impératives :
- Réponds UNIQUEMENT par le nom exact de la catégorie figurant dans la liste ci-dessus.
- Ne rajoute AUCUN texte d'introduction, AUCUNE explication, ni AUCUNE ponctuation supplémentaire.
- Note : Les caractères 'XXXX' ou 'XX' sont des masques d'anonymisation de données personnelles. Ignore-les et concentre-toi sur le contexte sémantique de la réclamation.
`;

function normalizeTag(rawPrediction) {
  if (!rawPrediction) return ALLOWED_TAGS[0];
  const cleaned = rawPrediction.trim();
  
  // Exact match
  const exact = ALLOWED_TAGS.find(t => t.toLowerCase() === cleaned.toLowerCase());
  if (exact) return exact;

  // Substring match
  const match = ALLOWED_TAGS.find(t => cleaned.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(cleaned.toLowerCase()));
  if (match) return match;

  return ALLOWED_TAGS[0];
}

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

    const prompt = `Réclamation client :\n"""\n${claim.content}\n"""\n\nCatégorie :`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: PROMPT_SYSTEM,
        temperature: 0.0,
        maxOutputTokens: 30,
      },
    });

    const rawPrediction = response.text ? response.text.trim() : '';
    const predictedTag = normalizeTag(rawPrediction);

    // Mettre à jour la base de données
    await setClaimTag(claimId, predictedTag);

    return NextResponse.json({
      success: true,
      claimId,
      tag: predictedTag,
      rawPrediction,
    });
  } catch (error) {
    console.error('Error auto-tagging claim with LLM:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to auto-tag claim' },
      { status: 500 }
    );
  }
}
