import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ParamsPromise {
  params: Promise<{ id: string }>;
}

/**
 * Parse YAML config file to extract source, destination, and transformations
 */
async function parseYamlConfig(pipelineId: string): Promise<any> {
  try {
    const configPath = path.join(process.cwd(), 'pipeline_artifacts', pipelineId, 'config.yaml');
    const content = await fs.readFile(configPath, 'utf-8');
    
    // Simple YAML parsing for our use case
    const config: any = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('name:')) {
        config.name = line.replace('name:', '').trim();
      } else if (line.startsWith('source:')) {
        config.hasSource = true;
      } else if (line.startsWith('destination:')) {
        config.hasDestination = true;
      } else if (line.startsWith('transformations:')) {
        config.hasTransformations = true;
      }
    }
    
    return config;
  } catch (error) {
    // If no YAML config exists, return empty object
    return {};
  }
}

export async function GET(_req: NextRequest, { params }: ParamsPromise) {
  try {
    const { id } = await params;
    const config = await parseYamlConfig(id);
    
    if (!config.name) {
      return NextResponse.json({ error: 'No config found' }, { status: 404 });
    }
    
    return NextResponse.json(config);
  } catch (error: any) {
    console.error('Error fetching pipeline config:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
