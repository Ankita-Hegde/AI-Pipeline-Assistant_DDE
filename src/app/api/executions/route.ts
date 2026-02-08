import { NextRequest, NextResponse } from 'next/server';
import { listExecutions } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const pipelineId = searchParams.get('pipelineId') ?? undefined;
  const executions = listExecutions(pipelineId || undefined);
  return NextResponse.json(executions);
}
