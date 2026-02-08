import { NextRequest, NextResponse } from 'next/server';
import { listAuditLogs, saveAuditLog } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  const logs = listAuditLogs();
  return NextResponse.json(logs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const entry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    userEmail: body.userEmail,
    action: body.action,
    targetType: body.targetType,
    targetId: body.targetId,
    details: body.details,
  };
  saveAuditLog(entry);
  return NextResponse.json(entry, { status: 201 });
}
