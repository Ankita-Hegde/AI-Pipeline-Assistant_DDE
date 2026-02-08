import { NextRequest, NextResponse } from 'next/server';
import { deletePipeline, getPipeline, savePipeline } from '@/lib/db';

interface ParamsPromise {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const pipeline = getPipeline(id);
    if (!pipeline) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(pipeline);
  } catch (error: any) {
    console.error('Error getting pipeline:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: ParamsPromise) {
  const { id } = await params;
  const existing = getPipeline(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const updated = {
    ...existing,
    ...body,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  savePipeline(updated);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: ParamsPromise) {
  const { id } = await params;
  const existing = getPipeline(id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  deletePipeline(id);
  return NextResponse.json({ ok: true });
}
