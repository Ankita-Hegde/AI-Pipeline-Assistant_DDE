import { NextRequest, NextResponse } from 'next/server';
import { listPipelines, savePipeline } from '@/lib/db';
import { Pipeline } from '@/lib/types';
import { randomUUID } from 'crypto';
import { savePipelineArtifacts } from '@/lib/artifacts';

export async function GET() {
  try {
    const pipelines = listPipelines();
    return NextResponse.json(pipelines);
  } catch (error: any) {
    console.error('Error listing pipelines:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const now = new Date().toISOString();

  const pipeline: Pipeline = {
    id: randomUUID(),
    name: body.name || 'Untitled pipeline',
    description: body.description || '',
    ownerEmail: body.ownerEmail || 'unknown@company.com',
    status: 'draft',
    trigger: body.trigger || 'manual',
    schedule: body.schedule,
    createdAt: now,
    updatedAt: now,
    version: 1,
    steps: body.steps || [],
  };

  // Save pipeline metadata
  savePipeline(pipeline);

  // If AI-generated artifacts are provided, save them
  if (body.artifacts) {
    try {
      await savePipelineArtifacts(pipeline.id, body.artifacts);
    } catch (error) {
      console.error('Failed to save pipeline artifacts:', error);
      // Continue anyway - artifacts are optional
    }
  }

  return NextResponse.json(pipeline, { status: 201 });
}
