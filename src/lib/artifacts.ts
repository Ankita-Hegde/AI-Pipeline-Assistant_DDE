import * as fs from "fs/promises";
import * as path from "path";

const ARTIFACTS_BASE_DIR = path.join(process.cwd(), "pipeline_artifacts");

export interface PipelineArtifacts {
  config: string;
  code: string;
  strategy: string;
  credentials?: string;
}

export async function savePipelineArtifacts(
  pipelineId: string,
  artifacts: PipelineArtifacts
): Promise<void> {
  const pipelineDir = path.join(ARTIFACTS_BASE_DIR, pipelineId);
  const logsDir = path.join(pipelineDir, "logs");

  // Create directory structure
  await fs.mkdir(pipelineDir, { recursive: true });
  await fs.mkdir(logsDir, { recursive: true });

  // Save artifacts
  await fs.writeFile(
    path.join(pipelineDir, "config.yaml"),
    artifacts.config,
    "utf-8"
  );
  await fs.writeFile(
    path.join(pipelineDir, "pipeline.py"),
    artifacts.code,
    "utf-8"
  );
  await fs.writeFile(
    path.join(pipelineDir, "EXECUTION_STRATEGY.md"),
    artifacts.strategy,
    "utf-8"
  );

  // Save credentials if provided
  if (artifacts.credentials) {
    await fs.writeFile(
      path.join(pipelineDir, "credentials.json"),
      artifacts.credentials,
      "utf-8"
    );
  }

  // Create a README
  const readme = `# Pipeline: ${pipelineId}

## Generated Artifacts

- **config.yaml**: Pipeline configuration
- **pipeline.py**: Executable pipeline code
- **EXECUTION_STRATEGY.md**: Idempotence and re-run strategy${artifacts.credentials ? '\n- **credentials.json**: Service account credentials' : ''}
- **logs/**: Execution logs directory

## Running the Pipeline

\`\`\`bash
python pipeline.py
\`\`\`

## Generated on

${new Date().toISOString()}
`;

  await fs.writeFile(
    path.join(pipelineDir, "README.md"),
    readme,
    "utf-8"
  );

  // Create .gitignore for logs
  await fs.writeFile(
    path.join(pipelineDir, ".gitignore"),
    "logs/*.log\n*.pyc\n__pycache__/\n",
    "utf-8"
  );
}

export async function getPipelineArtifacts(
  pipelineId: string
): Promise<PipelineArtifacts | null> {
  const pipelineDir = path.join(ARTIFACTS_BASE_DIR, pipelineId);

  try {
    const config = await fs.readFile(
      path.join(pipelineDir, "config.yaml"),
      "utf-8"
    );
    const code = await fs.readFile(
      path.join(pipelineDir, "pipeline.py"),
      "utf-8"
    );
    const strategy = await fs.readFile(
      path.join(pipelineDir, "EXECUTION_STRATEGY.md"),
      "utf-8"
    );

    return { config, code, strategy };
  } catch (error) {
    console.error(`Failed to read artifacts for pipeline ${pipelineId}:`, error);
    return null;
  }
}

export async function pipelineArtifactsExist(pipelineId: string): Promise<boolean> {
  const pipelineDir = path.join(ARTIFACTS_BASE_DIR, pipelineId);
  const pythonFile = path.join(pipelineDir, "pipeline.py");

  try {
    await fs.access(pythonFile);
    return true;
  } catch {
    return false;
  }
}

export function getPipelineArtifactsPath(pipelineId: string): string {
  return path.join(ARTIFACTS_BASE_DIR, pipelineId);
}

export function getPipelinePythonPath(pipelineId: string): string {
  return path.join(ARTIFACTS_BASE_DIR, pipelineId, "pipeline.py");
}

export function getPipelineLogsPath(pipelineId: string): string {
  return path.join(ARTIFACTS_BASE_DIR, pipelineId, "logs");
}
