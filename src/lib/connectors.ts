import { PipelineStep } from './types';

export interface ConnectorDefinition {
  id: string;
  name: string;
  kind: 'source' | 'destination';
  supportedTypes: string[];
  matchPatterns: string[]; // simple substrings like 's3://', 'postgres://'
  extractionTemplate: string;
}

export interface ConnectorRecommendation {
  connector: ConnectorDefinition;
  reason: string;
}

const CONNECTORS: ConnectorDefinition[] = [
  {
    id: 's3-csv-source',
    name: 'S3 CSV Source',
    kind: 'source',
    supportedTypes: ['csv'],
    matchPatterns: ['s3://'],
    extractionTemplate: `import boto3
import pandas as pd

s3 = boto3.client('s3')

bucket = 'my-bucket'
key = 'path/to/file.csv'

obj = s3.get_object(Bucket=bucket, Key=key)
df = pd.read_csv(obj['Body'])
print(df.head())`,
  },
  {
    id: 'http-json-source',
    name: 'HTTP JSON API Source',
    kind: 'source',
    supportedTypes: ['json'],
    matchPatterns: ['http://', 'https://'],
    extractionTemplate: `import requests

url = 'https://api.example.com/data'
resp = requests.get(url)
resp.raise_for_status()
items = resp.json()
print(items[:5])`,
  },
  {
    id: 'postgres-destination',
    name: 'PostgreSQL Destination',
    kind: 'destination',
    supportedTypes: ['table'],
    matchPatterns: ['postgres://', 'postgresql://'],
    extractionTemplate: `import sqlalchemy as sa

engine = sa.create_engine('postgresql://user:password@host:5432/dbname')

# df is a pandas DataFrame
with engine.begin() as conn:
    df.to_sql('target_table', conn, if_exists='append', index=False)`,
  },
];

export function recommendConnectors(step: PipelineStep): ConnectorRecommendation[] {
  const cfg = step.config || {};
  const url = String(cfg.url || cfg.endpoint || '');
  const format = String(cfg.format || cfg.fileType || '').toLowerCase();

  return CONNECTORS.filter((c) => c.kind === step.type).flatMap((c) => {
    const matchesPattern = c.matchPatterns.some((p) => url.includes(p));
    const matchesType = !format || c.supportedTypes.includes(format);
    if (!matchesPattern && !matchesType) return [];
    const reasons: string[] = [];
    if (matchesPattern) reasons.push(`URL matches pattern ${c.matchPatterns.join(', ')}`);
    if (matchesType) reasons.push(`Format '${format || 'any'}' supported`);
    return [
      {
        connector: c,
        reason: reasons.join('; '),
      },
    ];
  });
}

export function getExtractionTemplate(connectorId: string): string | undefined {
  const c = CONNECTORS.find((c) => c.id === connectorId);
  return c?.extractionTemplate;
}
