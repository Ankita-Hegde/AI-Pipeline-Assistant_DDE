"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import yaml from "js-yaml";

interface User {
  name: string;
  email: string;
  role: string;
}

function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("ai-pipeline-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function getSourceConfigPlaceholder(sourceType: string): string {
  const placeholders: Record<string, string> = {
    "Google Sheets": `{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "range": "Sheet1!A1:Z1000",
  "credentialsPath": "credentials.json"
}`,
    "MySQL": `{
  "host": "localhost",
  "port": 3306,
  "database": "mydb",
  "table": "customers",
  "user": "root",
  "password": "password"
}`
  };
  
  return placeholders[sourceType] || "{}";
}

function getDestinationConfigPlaceholder(destinationType: string): string {
  const placeholders: Record<string, string> = {
    "Google Sheets": `{
  "spreadsheetId": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "range": "Output!A1",
  "sheetName": "Pipeline_Output",
  "credentialsPath": "credentials.json"
}

Note: 'range' is optional. If not specified, a new sheet will be created automatically.`,
    "MySQL": `{
  "host": "localhost",
  "port": 3306,
  "database": "mydb",
  "table": "processed_data",
  "user": "root",
  "password": "password"
}`
  };
  
  return placeholders[destinationType] || "{}";
}

export default function NewPipelinePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const [mode, setMode] = useState<"ai" | "yaml">("ai");
  
  // AI Mode states
  const [aiInstructions, setAiInstructions] = useState("");
  const [aiSourceType, setAiSourceType] = useState("");
  const [aiSourceConfig, setAiSourceConfig] = useState("");
  const [aiDestinationType, setAiDestinationType] = useState("");
  const [aiDestinationConfig, setAiDestinationConfig] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGenerated, setAiGenerated] = useState<any>(null);
  
  // YAML Upload states
  const [yamlFile, setYamlFile] = useState<File | null>(null);
  const [yamlContent, setYamlContent] = useState("");
  const [yamlGenerating, setYamlGenerating] = useState(false);
  const [yamlGenerated, setYamlGenerated] = useState<any>(null);
  
  // Credentials file state (shared across modes)
  const [credentialsFile, setCredentialsFile] = useState<File | null>(null);
  const [credentialsContent, setCredentialsContent] = useState("");

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  function handleCredentialsUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('Please upload a JSON file');
      return;
    }

    setCredentialsFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCredentialsContent(content);
    };
    reader.readAsText(file);
  }

  async function generateWithAI() {
    if (!aiInstructions.trim()) {
      alert("Please provide instructions for the AI to generate the pipeline.");
      return;
    }

    if (!aiSourceType || !aiSourceConfig) {
      alert("Please configure the data source.");
      return;
    }

    if (!aiDestinationType || !aiDestinationConfig) {
      alert("Please configure the destination.");
      return;
    }

    setAiGenerating(true);
    setAiGenerated(null);

    // Build complete instructions including source and destination
    const completeInstructions = `${aiInstructions}

Data Source Configuration:
- Type: ${aiSourceType}
- Config: ${aiSourceConfig}

Destination Configuration:
- Type: ${aiDestinationType}
- Config: ${aiDestinationConfig}`;

    try {
      const res = await fetch("/api/ai/generate-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: completeInstructions,
          ownerEmail: user?.email ?? "unknown@company.com",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate pipeline");
      }

      const generated = await res.json();
      setAiGenerated(generated);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to generate pipeline: ${e.message}`);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleYamlUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setYamlFile(file);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setYamlContent(content);
    };
    reader.readAsText(file);
  }

  async function generateFromYaml() {
    if (!yamlContent.trim()) {
      alert("Please upload a YAML file first.");
      return;
    }

    setYamlGenerating(true);
    setYamlGenerated(null);

    try {
      // Parse YAML to extract source/destination info
      const yamlData = yaml.load(yamlContent) as any;
      
      const instructions = `Generate a complete pipeline based on this configuration:

${yamlContent}

Please create:
1. A properly structured config.yaml file
2. Executable Python code that implements this pipeline
3. Execution strategy

Ensure the pipeline handles the specified source, transformations, and destination correctly.`;

      const res = await fetch("/api/ai/generate-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions,
          ownerEmail: user?.email ?? "unknown@company.com",
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to generate pipeline");
      }

      const generated = await res.json();
      setYamlGenerated(generated);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to generate pipeline from YAML: ${e.message}`);
    } finally {
      setYamlGenerating(false);
    }
  }

  async function createPipeline() {
    let payload: any;

    if (mode === "ai") {
      if (!aiGenerated) {
        alert("Please generate the pipeline first using the AI Assistant.");
        return;
      }

      try {
        const trimmed = aiGenerated.config.trim();
        const raw: any = yaml.load(trimmed) as any;

        const steps = Array.isArray(raw.steps) ? raw.steps : [];
        const normalizedSteps = steps.map((s: any, index: number) => ({
          id: crypto.randomUUID(),
          type: s.type === "source" || s.type === "destination" || s.type === "transform" ? s.type : "transform",
          name: s.name || `Step ${index + 1}`,
          description: s.description || "",
          config: s.config || {},
        }));

        payload = {
          name: raw.name || "AI-Generated Pipeline",
          description: raw.description || "",
          ownerEmail: user?.email ?? raw.ownerEmail ?? "unknown@company.com",
          trigger: raw.trigger === "scheduled" || raw.trigger === "event" ? raw.trigger : "manual",
          schedule: raw.schedule,
          steps: normalizedSteps,
          artifacts: {
            config: aiGenerated.config,
            code: aiGenerated.code,
            tests: aiGenerated.tests,
            strategy: aiGenerated.strategy,
            credentials: credentialsContent || undefined,
          },
        };
      } catch (e) {
        console.error(e);
        alert("Failed to parse AI-generated configuration.");
        return;
      }
    } else if (mode === "yaml") {
      if (!yamlGenerated) {
        alert("Please generate the pipeline from the uploaded YAML first.");
        return;
      }

      try {
        const trimmed = yamlGenerated.config.trim();
        const raw: any = yaml.load(trimmed) as any;

        const steps = Array.isArray(raw.steps) ? raw.steps : [];
        const normalizedSteps = steps.map((s: any, index: number) => ({
          id: crypto.randomUUID(),
          type: s.type === "source" || s.type === "destination" || s.type === "transform" ? s.type : "transform",
          name: s.name || `Step ${index + 1}`,
          description: s.description || "",
          config: s.config || {},
        }));

        payload = {
          name: raw.name || "YAML-Based Pipeline",
          description: raw.description || "",
          ownerEmail: user?.email ?? raw.ownerEmail ?? "unknown@company.com",
          trigger: raw.trigger === "scheduled" || raw.trigger === "event" ? raw.trigger : "manual",
          schedule: raw.schedule,
          steps: normalizedSteps,
          artifacts: {
            config: yamlGenerated.config,
            code: yamlGenerated.code,
            tests: yamlGenerated.tests,
            strategy: yamlGenerated.strategy,
            credentials: credentialsContent || undefined,
          },
        };
      } catch (e) {
        console.error(e);
        alert("Failed to parse YAML configuration.");
        return;
      }
    }

    setCreating(true);
    try {
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create pipeline");
      const p = await res.json();
      router.push(`/pipelines/${p.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create pipeline");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">\n        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">
                AI Pipeline Assistant
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Create a new data pipeline
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </div>
                <div className="inline-flex items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
                  {user.role}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <a href="/dashboard" className="hover:text-blue-400">Pipelines</a>
          <span>/</span>
          <span className="font-medium text-white">New Pipeline</span>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Create New Pipeline</h2>
          <p className="mt-2 text-sm text-slate-400">
            Define a name and description, then design steps in the builder.
          </p>
        </div>

        {/* Main Form Card */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-8 shadow-sm">
          {/* Mode Tabs */}
          <div className="mb-6 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("ai")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                mode === "ai"
                  ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">✨</span>
                <div className="text-left">
                  <div className="font-bold">Natural Language Prompt</div>
                  <div className="text-xs opacity-90">Describe what you need + configure source & destination</div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMode("yaml")}
              className={`flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                mode === "yaml"
                  ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">📄</span>
                <div className="text-left">
                  <div className="font-bold">YAML Upload</div>
                  <div className="text-xs opacity-90">Upload complete pipeline configuration</div>
                </div>
              </div>
            </button>
          </div>

          {mode === "ai" ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-purple-800 bg-purple-900/30 p-4">
                <div className="flex gap-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <h4 className="font-semibold text-purple-300">AI-Powered Pipeline Generation</h4>
                    <p className="mt-1 text-sm text-purple-200">
                      Describe your transformations in natural language, configure your source and destination, and AI will generate:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-purple-200">
                      <li>• Complete pipeline configuration (YAML)</li>
                      <li>• Executable Python code with error handling</li>
                      <li>• Idempotence and re-run strategy</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Data Source Configuration */}
              <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-200">📥 Data Source</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Source Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={aiSourceType}
                      onChange={(e) => setAiSourceType(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select a data source...</option>
                      <option value="Google Sheets">Google Sheets</option>
                      <option value="MySQL">MySQL Database</option>
                    </select>
                  </div>

                  {aiSourceType && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-300">
                        Source Configuration (JSON) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={aiSourceConfig}
                        onChange={(e) => setAiSourceConfig(e.target.value)}
                        rows={6}
                        className="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 font-mono text-xs text-white placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder={getSourceConfigPlaceholder(aiSourceType)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Transformation Description */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Transformation Requirements <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={aiInstructions}
                  onChange={(e) => setAiInstructions(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  placeholder={`Describe the transformations needed:

Example:
- Calculate total_revenue = unit_price * quantity
- Filter orders where total_revenue > 100
- Group by product_name and calculate sum, count, average
- Run daily at 9 AM`}
                  disabled={aiGenerating}
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Describe filtering, calculations, aggregations, and scheduling
                </p>
              </div>

              {/* Data Destination Configuration */}
              <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-5">
                <h3 className="mb-4 text-sm font-bold text-slate-200">📤 Destination</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-300">
                      Destination Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={aiDestinationType}
                      onChange={(e) => setAiDestinationType(e.target.value)}
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="">Select a destination...</option>
                      <option value="Google Sheets">Google Sheets</option>
                      <option value="MySQL">MySQL Database</option>
                    </select>
                  </div>

                  {aiDestinationType && (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-300">
                        Destination Configuration (JSON) <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        value={aiDestinationConfig}
                        onChange={(e) => setAiDestinationConfig(e.target.value)}
                        rows={6}
                        className="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 font-mono text-xs text-white placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        placeholder={getDestinationConfigPlaceholder(aiDestinationType)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Credentials Upload Section */}
              <div className="rounded-lg border border-amber-800 bg-amber-900/30 p-5">
                <h3 className="mb-4 text-sm font-bold text-amber-300">📁 Credentials File (Optional)</h3>
                
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Upload Credentials JSON
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleCredentialsUpload}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Upload your credentials.json file for Google Sheets or other services
                  </p>
                  {credentialsFile && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Uploaded: {credentialsFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={generateWithAI}
                disabled={aiGenerating || !aiInstructions.trim() || !aiSourceType || !aiDestinationType}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-purple-700 hover:to-purple-800 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {aiGenerating ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Pipeline with AI...
                  </>
                ) : (
                  <>
                    ✨ Generate Pipeline
                  </>
                )}
              </button>

              {aiGenerated && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-800 bg-green-900/30 p-4">
                    <div className="flex items-center gap-2 text-green-300">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold">Pipeline Generated Successfully!</span>
                    </div>
                    <p className="mt-2 text-sm text-green-200">
                      Review the generated artifacts below and click "Create Pipeline" to proceed.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <details className="rounded-lg border border-slate-600 bg-slate-700/50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                        📄 Pipeline Configuration (YAML)
                      </summary>
                      <div className="border-t border-slate-600 p-4">
                        <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-300">
                          {aiGenerated.config}
                        </pre>
                      </div>
                    </details>

                    <details className="rounded-lg border border-slate-600 bg-slate-700/50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                        🐍 Generated Python Code
                      </summary>
                      <div className="border-t border-slate-600 p-4">
                        <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-300">
                          {aiGenerated.code}
                        </pre>
                      </div>
                    </details>

                    <details className="rounded-lg border border-slate-600 bg-slate-700/50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                        📋 Execution Strategy
                      </summary>
                      <div className="border-t border-slate-600 p-4">
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-900 p-4 text-xs text-slate-300">
                          {aiGenerated.strategy}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg border border-blue-800 bg-blue-900/30 p-4">
                <div className="flex gap-3">
                  <div className="text-2xl">📄</div>
                  <div>
                    <h4 className="font-semibold text-blue-300">YAML Pipeline Upload</h4>
                    <p className="mt-1 text-sm text-blue-200">
                      Upload a complete YAML configuration file that includes source, transformations, destination, and credentials. AI will generate:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-blue-200">
                      <li>• Structured config.yaml file</li>
                      <li>• Executable Python code</li>
                      <li>• Execution strategy</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Upload YAML File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".yaml,.yml"
                  onChange={handleYamlUpload}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-slate-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Upload a YAML file containing source, transformations, destination, and credentials
                </p>
              </div>

              {yamlContent && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Preview
                  </label>
                  <div className="rounded-lg border border-slate-600 bg-slate-900 p-4">
                    <pre className="overflow-x-auto text-xs text-slate-300">
                      {yamlContent}
                    </pre>
                  </div>
                </div>
              )}
              {/* Credentials Upload Section */}
              <div className="rounded-lg border border-amber-800 bg-amber-900/30 p-5">
                <h3 className="mb-4 text-sm font-bold text-amber-300">📁 Credentials File (Optional)</h3>
                
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-300">
                    Upload Credentials JSON
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleCredentialsUpload}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-sm text-white file:mr-4 file:rounded file:border-0 file:bg-amber-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    Upload your credentials.json file for Google Sheets or other services
                  </p>
                  {credentialsFile && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-green-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Uploaded: {credentialsFile.name}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={generateFromYaml}
                disabled={yamlGenerating || !yamlContent}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {yamlGenerating ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Pipeline from YAML...
                  </>
                ) : (
                  <>
                    🚀 Generate Pipeline
                  </>
                )}
              </button>

              {yamlGenerated && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-800 bg-green-900/30 p-4">
                    <div className="flex items-center gap-2 text-green-300">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-semibold">Pipeline Generated Successfully!</span>
                    </div>
                    <p className="mt-2 text-sm text-green-200">
                      Review the generated artifacts below and click "Create Pipeline" to proceed.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <details className="rounded-lg border border-slate-600 bg-slate-700/50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                        📄 Pipeline Configuration (YAML)
                      </summary>
                      <div className="border-t border-slate-600 p-4">
                        <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-300">
                          {yamlGenerated.config}
                        </pre>
                      </div>
                    </details>

                    <details className="rounded-lg border border-slate-600 bg-slate-700/50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                        🐍 Generated Python Code
                      </summary>
                      <div className="border-t border-slate-600 p-4">
                        <pre className="overflow-x-auto rounded bg-slate-900 p-4 text-xs text-slate-300">
                          {yamlGenerated.code}
                        </pre>
                      </div>
                    </details>

                    <details className="rounded-lg border border-slate-600 bg-slate-700/50">
                      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                        📋 Execution Strategy
                      </summary>
                      <div className="border-t border-slate-600 p-4">
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-900 p-4 text-xs text-slate-300">
                          {yamlGenerated.strategy}
                        </pre>
                      </div>
                    </details>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 flex items-center justify-between border-t border-slate-600 pt-6">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-lg border border-slate-600 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createPipeline}
              disabled={creating || (!aiGenerated && !yamlGenerated)}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {creating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  <span className="text-lg">+</span>
                  Create Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
