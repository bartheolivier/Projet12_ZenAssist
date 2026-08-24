import { NextResponse } from 'next/server';
import { getAllClaims, getClaimsByTag } from '@/database/queries.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tag = searchParams.get('tag');

    let claims;
    if (tag === 'all') {
      claims = await getAllClaims();
    } else if (tag === 'null' || tag === 'untagged') {
      claims = await getClaimsByTag(null);
    } else if (tag) {
      claims = await getClaimsByTag(tag);
    } else {
      claims = await getAllClaims();
    }

    return NextResponse.json(claims, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error fetching claims:', error);
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
  }
}
