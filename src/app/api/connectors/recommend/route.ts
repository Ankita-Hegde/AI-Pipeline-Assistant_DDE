import { NextRequest, NextResponse } from 'next/server';
import { recommendConnectors } from '@/lib/connectors';
import { PipelineStep } from '@/lib/types';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const step = body.step as PipelineStep | undefined;

  if (!step) {
    return NextResponse.json({ error: 'Missing step' }, { status: 400 });
  }

  const recs = recommendConnectors(step);
  return NextResponse.json({ recommendations: recs });
}
