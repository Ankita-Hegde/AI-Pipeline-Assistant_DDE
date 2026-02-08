import { NextRequest, NextResponse } from 'next/server';

interface ColumnProfile {
  name: string;
  type: string;
  nullable: boolean;
  nullCount: number;
  totalCount: number;
  examples: string[];
}

function inferType(values: string[]): string {
  const nonEmpty = values.filter((v) => v !== '' && v != null);
  if (nonEmpty.length === 0) return 'unknown';

  const allNumbers = nonEmpty.every((v) => !Number.isNaN(Number(v)));
  if (allNumbers) return 'number';

  const allBooleans = nonEmpty.every((v) => ['true', 'false'].includes(v.toLowerCase()));
  if (allBooleans) return 'boolean';

  const allDates = nonEmpty.every((v) => !Number.isNaN(Date.parse(v)));
  if (allDates) return 'date';

  return 'string';
}

function profileCsv(sample: string): ColumnProfile[] {
  const lines = sample
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(',').map((h) => h.trim());
  const maxRows = 50;

  const columns: ColumnProfile[] = headers.map((name) => ({
    name,
    type: 'unknown',
    nullable: false,
    nullCount: 0,
    totalCount: 0,
    examples: [],
  }));

  dataLines.slice(0, maxRows).forEach((line) => {
    const values = line.split(',');
    headers.forEach((h, idx) => {
      const raw = (values[idx] ?? '').trim();
      const col = columns[idx];
      col.totalCount += 1;
      if (raw === '' || raw.toLowerCase() === 'null') {
        col.nullCount += 1;
      } else if (col.examples.length < 3) {
        col.examples.push(raw);
      }
    });
  });

  columns.forEach((col, idx) => {
    const values: string[] = [];
    dataLines.slice(0, maxRows).forEach((line) => {
      const v = (line.split(',')[idx] ?? '').trim();
      if (v !== '') values.push(v);
    });
    col.type = inferType(values);
    col.nullable = col.nullCount > 0;
  });

  return columns;
}

function profileJson(sample: string): ColumnProfile[] {
  let records: any[] = [];
  const trimmed = sample.trim();
  try {
    if (trimmed.startsWith('[')) {
      records = JSON.parse(trimmed);
    } else {
      records = trimmed
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
        .map((l) => JSON.parse(l));
    }
  } catch {
    return [];
  }

  if (!Array.isArray(records) || records.length === 0) return [];

  const keys = new Set<string>();
  records.slice(0, 100).forEach((r) => {
    Object.keys(r || {}).forEach((k) => keys.add(k));
  });

  const columns: ColumnProfile[] = Array.from(keys).map((name) => ({
    name,
    type: 'unknown',
    nullable: false,
    nullCount: 0,
    totalCount: 0,
    examples: [],
  }));

  records.slice(0, 100).forEach((r) => {
    columns.forEach((col) => {
      const v = r ? r[col.name] : undefined;
      col.totalCount += 1;
      if (v === null || v === undefined || v === '') {
        col.nullCount += 1;
      } else if (col.examples.length < 3) {
        col.examples.push(String(v));
      }
    });
  });

  columns.forEach((col) => {
    const values: string[] = [];
    records.slice(0, 100).forEach((r) => {
      const v = r ? r[col.name] : undefined;
      if (v !== null && v !== undefined && v !== '') {
        values.push(String(v));
      }
    });
    col.type = inferType(values);
    col.nullable = col.nullCount > 0;
  });

  return columns;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sample = String(body.sample ?? '').trim();
  const format = (body.format as 'csv' | 'json' | undefined) ?? 'csv';

  if (!sample) {
    return NextResponse.json({ error: 'Missing sample' }, { status: 400 });
  }

  const columns = format === 'json' ? profileJson(sample) : profileCsv(sample);

  return NextResponse.json({ columns });
}
