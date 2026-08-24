import { NextResponse } from 'next/server';
import { setClaimTag } from '@/database/queries.js';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    // Permet d'assigner un tag OU de le supprimer (tag = null)
    const tag = body.tag ? body.tag.trim() : null;
    const resolvedParams = await params;
    const claimId = parseInt(resolvedParams.id);

    if (isNaN(claimId)) {
      return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 });
    }

    await setClaimTag(claimId, tag);

    return NextResponse.json({ success: true, claimId, tag });
  } catch (error) {
    console.error('Error updating claim tag:', error);
    return NextResponse.json({ error: 'Failed to update claim tag' }, { status: 500 });
  }
}
