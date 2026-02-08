"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Pipeline, PipelineStep } from "@/lib/types";
import { validatePipeline, getValidationSummary } from "@/lib/validation";
import type { ValidationResult } from "@/lib/validation";

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

export default function PipelineDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [sampleData, setSampleData] = useState("");
  const [profileFormat, setProfileFormat] = useState<"csv" | "json">("csv");
  const [profileResult, setProfileResult] = useState<any | null>(null);
  const [profiling, setProfiling] = useState(false);
  const [connectorStepId, setConnectorStepId] = useState<string>("");
  const [connectorRecs, setConnectorRecs] = useState<any[] | null>(null);
  const [loadingConnectors, setLoadingConnectors] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [showExecutionResults, setShowExecutionResults] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  // Validate pipeline whenever it changes
  useEffect(() => {
    if (pipeline) {
      // Fetch YAML config if this is an AI-generated pipeline
      const fetchYamlConfig = async () => {
        try {
          const response = await fetch(`/api/pipelines/${params.id}/config`);
          if (response.ok) {
            const yamlConfig = await response.json();
            const validation = validatePipeline(pipeline, yamlConfig);
            setValidationResult(validation);
          } else {
            // No YAML config, just validate the pipeline object
            const validation = validatePipeline(pipeline);
            setValidationResult(validation);
          }
        } catch (error) {
          // Fall back to validating without YAML config
          const validation = validatePipeline(pipeline);
          setValidationResult(validation);
        }
      };
      
      fetchYamlConfig();
    }
  }, [pipeline, params.id]);

  useEffect(() => {
    async function load() {
      try {
        const [pipelineRes, executionsRes] = await Promise.all([
          fetch(`/api/pipelines/${params.id}`),
          fetch(`/api/executions`)
        ]);
        
        if (!pipelineRes.ok) {
          router.push("/dashboard");
          return;
        }
        
        const pipelineData = await pipelineRes.json() as Pipeline;
        setPipeline(pipelineData);
        
        if (executionsRes.ok) {
          const allExecutions = await executionsRes.json();
          // Filter executions for this pipeline
          const pipelineExecutions = allExecutions.filter((e: any) => e.pipelineId === params.id);
          setExecutions(pipelineExecutions);
        }
      } finally {
        setLoading(false);
      }
    }
    if (params.id) load();
  }, [params.id, router]);

  const canEdit = user && (user.role === "admin" || user.role === "engineer");
  
  // Check if pipeline is Google Sheets only
  const isGoogleSheetsOnly = () => {
    if (!pipeline) return false;
    const sourceStep = pipeline.steps.find(s => s.type === 'source');
    const destinationStep = pipeline.steps.find(s => s.type === 'destination');
    
    const isSourceGSheets = sourceStep && (sourceStep.name.includes('Google Sheets') || (sourceStep.config as any)?.type === 'google_sheets');
    const isDestGSheets = destinationStep && (destinationStep.name.includes('Google Sheets') || (destinationStep.config as any)?.type === 'google_sheets');
    
    return isSourceGSheets && isDestGSheets;
  };
  
  const canExecute = user && (user.role === "admin" || user.role === "engineer" || user.role === "operator") && isGoogleSheetsOnly();

  async function refreshPipelineData() {
    console.log('🔄 Refreshing pipeline data...');
    try {
      const [pipelineRes, executionsRes] = await Promise.all([
        fetch(`/api/pipelines/${params.id}`),
        fetch(`/api/executions`)
      ]);
      
      if (pipelineRes.ok) {
        const pipelineData = await pipelineRes.json() as Pipeline;
        console.log('✅ Pipeline refreshed:', pipelineData.status);
        setPipeline(pipelineData);
      } else {
        console.error('❌ Failed to fetch pipeline:', pipelineRes.status);
      }
      
      if (executionsRes.ok) {
        const allExecutions = await executionsRes.json();
        const pipelineExecutions = allExecutions.filter((e: any) => e.pipelineId === params.id);
        console.log('✅ Executions refreshed:', pipelineExecutions.length);
        setExecutions(pipelineExecutions);
      } else {
        console.error('❌ Failed to fetch executions:', executionsRes.status);
      }
    } catch (e) {
      console.error('❌ Failed to refresh pipeline data:', e);
    }
  }

  async function updatePipeline(partial: Partial<Pipeline>) {
    if (!pipeline) return;
    const next = { ...pipeline, ...partial };
    setPipeline(next);
  }

  async function save() {
    if (!pipeline) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pipeline),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = (await res.json()) as Pipeline;
      setPipeline(data);
    } catch (e) {
      console.error(e);
      alert("Failed to save pipeline");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pipeline) return;
    if (!confirm("Delete this pipeline? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Failed to delete pipeline");
      setDeleting(false);
    }
  }

  async function run() {
    if (!pipeline) return;
    setRunning(true);
    setShowExecutionResults(true);
    setExecutionResult(null);
    
    try {
      const res = await fetch(`/api/pipelines/${pipeline.id}/execute`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to execute");
      const exec = await res.json();
      
      setExecutionResult(exec);
      
      // Wait for the database to be updated (increased delay for async writes)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Reload pipeline to get updated status
      await refreshPipelineData();
    } catch (e) {
      console.error(e);
      setExecutionResult({
        status: 'failed',
        logs: ['Failed to execute pipeline: ' + (e as Error).message]
      });
    } finally {
      setRunning(false);
    }
  }

  async function askAI() {
    if (!aiPrompt.trim()) return;
    setAiResponse("Thinking...");
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, pipeline }),
      });
      const data = await res.json();
      setAiResponse(data.text ?? "No response");
    } catch (e) {
      console.error(e);
      setAiResponse("AI request failed. Check API configuration.");
    }
  }

  async function profileData() {
    if (!sampleData.trim()) {
      alert("Paste a small CSV or JSON sample first.");
      return;
    }
    setProfiling(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample: sampleData, format: profileFormat }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Profiling failed");
      }
      setProfileResult(data);
    } catch (e) {
      console.error(e);
      alert("Failed to profile data. Check that the sample is valid.");
    } finally {
      setProfiling(false);
    }
  }

  async function fetchConnectorRecommendations() {
    if (!pipeline) return;
    const target = pipeline.steps.find((s) => s.id === connectorStepId && (s.type === "source" || s.type === "destination"));
    if (!target) {
      alert("Select a source or destination step first.");
      return;
    }
    setLoadingConnectors(true);
    try {
      const res = await fetch("/api/connectors/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: target }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to get recommendations");
      }
      setConnectorRecs(data.recommendations || []);
    } catch (e) {
      console.error(e);
      alert("Failed to get connector recommendations.");
    } finally {
      setLoadingConnectors(false);
    }
  }

  function addStep(type: PipelineStep["type"]) {
    if (!pipeline || !canEdit) return;
    const step: PipelineStep = {
      id: crypto.randomUUID(),
      type,
      name: `${type[0].toUpperCase()}${type.slice(1)} step`,
      description: "",
      config: {},
    };
    updatePipeline({ steps: [...pipeline.steps, step] });
  }

  if (loading || !pipeline) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-slate-300">Loading pipeline...</div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700 border-slate-300",
    running: "bg-amber-100 text-amber-800 border-amber-300",
    succeeded: "bg-emerald-100 text-emerald-800 border-emerald-300",
    failed: "bg-rose-100 text-rose-800 border-rose-300",
    deployed: "bg-blue-100 text-blue-800 border-blue-300",
    archived: "bg-gray-100 text-gray-700 border-gray-300",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-700 text-slate-200 transition-all hover:bg-slate-600 hover:border-slate-500"
                title="Back to Dashboard"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  AI Pipeline Assistant
                </h1>
                <p className="mt-1 text-sm text-slate-300">
                  Pipeline details
                </p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-semibold text-white">{user.name}</div>
                  <div className="text-xs text-slate-300">{user.email}</div>
                </div>
                <div className="inline-flex items-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm">
                  {user.role}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Execution Results Modal */}
        {showExecutionResults && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
              <div className="border-b border-slate-700 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">
                    {running ? '⏳ Pipeline Executing...' : '📊 Execution Results'}
                  </h2>
                  <button
                    onClick={() => setShowExecutionResults(false)}
                    className="rounded-lg p-2 hover:bg-slate-700"
                    disabled={running}
                  >
                    <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-6">
                {running && !executionResult && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
                    <p className="mt-4 text-sm text-slate-300">Running pipeline...</p>
                  </div>
                )}
                
                {executionResult && (
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-700/50 p-4">
                      <div>
                        <div className="text-sm font-medium text-slate-300">Status</div>
                        <div className="mt-1 flex items-center gap-2">
                          <span className={
                            executionResult.status === 'succeeded'
                              ? 'inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800'
                              : 'inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-sm font-semibold text-rose-800'
                          }>
                            {executionResult.status === 'succeeded' ? '✓ Succeeded' : '✗ Failed'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-slate-300">Duration</div>
                        <div className="mt-1 text-sm text-white">
                          {executionResult.startedAt && executionResult.finishedAt 
                            ? `${Math.round((new Date(executionResult.finishedAt).getTime() - new Date(executionResult.startedAt).getTime()) / 1000)}s`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>

                    {/* Transformation Summary */}
                    {executionResult.logs?.some((log: string) => log.includes('🔄 Transforming') || log.includes('✓')) && (
                      <div>
                        <h3 className="mb-2 text-sm font-semibold text-white">Data Transformations Applied</h3>
                        <div className="rounded-lg border border-slate-700 bg-slate-700/50 p-4">
                          <div className="space-y-2 text-xs text-slate-300">
                            {executionResult.logs
                              ?.filter((log: string) => 
                                log.includes('✓ Columns renamed') ||
                                log.includes('✓ Filtered') ||
                                log.includes('✓ Added') ||
                                log.includes('✓ Selected') ||
                                log.includes('✓ Types converted') ||
                                log.includes('✓ Grouped') ||
                                log.includes('Applying column mapping') ||
                                log.includes('Applying filters') ||
                                log.includes('Adding calculated columns') ||
                                log.includes('Selecting specific columns') ||
                                log.includes('Converting data types') ||
                                log.includes('Applying aggregations')
                              )
                              .map((log: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2">
                                  {log.includes('✓') ? (
                                    <span className="text-emerald-400">✓</span>
                                  ) : (
                                    <span className="text-blue-400">→</span>
                                  )}
                                  <span className="flex-1">{log.replace(/^\s+/, '')}</span>
                                </div>
                              ))}
                            {!executionResult.logs?.some((log: string) => 
                              log.includes('✓ Columns renamed') ||
                              log.includes('✓ Filtered') ||
                              log.includes('✓ Added') ||
                              log.includes('✓ Selected') ||
                              log.includes('✓ Types converted') ||
                              log.includes('✓ Grouped')
                            ) && (
                              <div className="flex items-center gap-2 text-slate-400">
                                <span>ℹ️</span>
                                <span>No transformations applied - data passed through as-is</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Execution Logs */}
                    <div>
                      <h3 className="mb-2 text-sm font-semibold text-white">Execution Logs</h3>
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                        <pre className="overflow-x-auto text-xs leading-relaxed text-emerald-400">
                          {executionResult.logs?.join('\n') || 'No logs available'}
                        </pre>
                      </div>
                    </div>

                    {/* Execution Details */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-slate-700 bg-slate-700/50 p-4">
                        <div className="text-xs font-medium text-slate-300">Started At</div>
                        <div className="mt-1 text-sm text-white">
                          {executionResult.startedAt 
                            ? new Date(executionResult.startedAt).toLocaleString()
                            : 'N/A'
                          }
                        </div>
                      </div>
                      <div className="rounded-lg border border-slate-700 bg-slate-700/50 p-4">
                        <div className="text-xs font-medium text-slate-300">Finished At</div>
                        <div className="mt-1 text-sm text-white">
                          {executionResult.finishedAt 
                            ? new Date(executionResult.finishedAt).toLocaleString()
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700 p-6">
                <button
                  onClick={async () => {
                    console.log('🔘 Close button clicked');
                    await refreshPipelineData();
                    setShowExecutionResults(false);
                  }}
                  disabled={running}
                  className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-slate-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-sm text-slate-400">
          <a href="/dashboard" className="hover:text-blue-400">Pipelines</a>
          <span>/</span>
          <span className="font-medium text-white">{pipeline.name}</span>
        </div>

        {/* Pipeline Header Card */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <input
                    type="text"
                    value={pipeline.name}
                    onChange={(e) => updatePipeline({ name: e.target.value })}
                    className="text-2xl font-bold text-white border-b-2 border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none bg-transparent"
                    placeholder="Pipeline name"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-white">{pipeline.name}</h2>
                )}
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusColors[pipeline.status] || statusColors.draft}`}>
                  {pipeline.status}
                </span>
              </div>
              {isEditing ? (
                <textarea
                  value={pipeline.description || ""}
                  onChange={(e) => updatePipeline({ description: e.target.value })}
                  rows={2}
                  className="mt-2 w-full resize-none rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                  placeholder="Pipeline description"
                />
              ) : (
                <p className="mt-2 text-sm text-slate-300">
                  {pipeline.description || "No description provided"}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                <span>Owner: <span className="font-medium text-slate-200">{pipeline.ownerEmail}</span></span>
                <span>Created: <span className="font-medium text-slate-200">{new Date(pipeline.createdAt).toLocaleDateString()}</span></span>
                <span>Updated: <span className="font-medium text-slate-200">{new Date(pipeline.updatedAt).toLocaleDateString()}</span></span>
                <span>Steps: <span className="font-medium text-slate-200">{pipeline.steps.length}</span></span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              {!isGoogleSheetsOnly() && user && (user.role === "admin" || user.role === "engineer" || user.role === "operator") && (
                <div className="w-full rounded-lg border border-amber-700 bg-amber-900/30 p-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span className="text-sm text-amber-200">
                      <strong>Execution Disabled:</strong> This pipeline uses MySQL, PostgreSQL, or other non-Google Sheets connectors. 
                      To execute this pipeline, ensure both Source and Destination are set to Google Sheets.
                    </span>
                  </div>
                </div>
              )}
              {canExecute && !isEditing && (
                <button
                  onClick={run}
                  disabled={running}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60"
                >
                  {running ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Run Pipeline
                    </>
                  )}
                </button>
              )}
              {canEdit && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              {canEdit && isEditing && (
                <>
                  <button
                    onClick={async () => {
                      await save();
                      setIsEditing(false);
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={async () => {
                      setIsEditing(false);
                      // Reload pipeline to discard changes
                      const res = await fetch(`/api/pipelines/${params.id}`);
                      if (res.ok) {
                        const data = await res.json();
                        setPipeline(data);
                      }
                    }}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-all hover:bg-slate-600 disabled:opacity-60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                </>
              )}
              {canEdit && !isEditing && (
                <button
                  onClick={remove}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700 transition-all hover:bg-rose-50 disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pipeline Metrics */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-purple-700 bg-gradient-to-br from-purple-900/50 to-pink-900/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-purple-300">Total Executions</div>
                <div className="mt-1 text-2xl font-bold text-purple-100">
                  {executions.length}
                </div>
              </div>
              <div className="rounded-full bg-purple-500 p-2 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-700 bg-gradient-to-br from-cyan-900/50 to-teal-900/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-cyan-300">Success Rate</div>
                <div className="mt-1 text-2xl font-bold text-cyan-100">
                  {executions.length > 0 
                    ? `${((executions.filter(e => e.status === 'succeeded').length / executions.length) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </div>
              </div>
              <div className="rounded-full bg-cyan-500 p-2 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-indigo-700 bg-gradient-to-br from-indigo-900/50 to-blue-900/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-indigo-300">Avg. Duration</div>
                <div className="mt-1 text-2xl font-bold text-indigo-100">
                  {executions.length > 0 && executions.some(e => e.startedAt && e.finishedAt)
                    ? `${Math.round(
                        executions
                          .filter(e => e.startedAt && e.finishedAt)
                          .map(e => new Date(e.finishedAt).getTime() - new Date(e.startedAt).getTime())
                          .reduce((a, b) => a + b, 0) / 
                        executions.filter(e => e.startedAt && e.finishedAt).length / 1000
                      )}s`
                    : '0s'
                  }
                </div>
              </div>
              <div className="rounded-full bg-indigo-500 p-2 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-700 bg-gradient-to-br from-emerald-900/50 to-green-900/50 p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-emerald-300">Last Run</div>
                <div className="mt-1 text-sm font-bold text-emerald-100">
                  {executions.length > 0 
                    ? new Date(executions[0].startedAt).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>
              <div className="rounded-full bg-emerald-500 p-2 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Validation - Config Based */}
        <div className="mb-6 rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
          <h3 className="mb-2 text-lg font-bold text-white">Pipeline Validation</h3>
          {validationResult && (
            <p className="mb-4 text-sm text-slate-400">{getValidationSummary(validationResult)}</p>
          )}
          
          <div className="space-y-2">
            {validationResult?.checks.map((check, idx) => {
              const statusIcons = {
                pass: <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>,
                warn: <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>,
                fail: <svg className="h-4 w-4 text-rose-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>,
              };
              const statusColors = {
                pass: 'border-emerald-700 bg-emerald-900/20',
                warn: 'border-amber-700 bg-amber-900/20',
                fail: 'border-rose-700 bg-rose-900/20',
              };

              return (
                <div key={idx} className={`flex items-start gap-3 rounded-lg border p-3 ${statusColors[check.status]}`}>
                  <div className="shrink-0 pt-0.5">
                    {statusIcons[check.status]}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{check.name}</div>
                    <div className="mt-0.5 text-xs text-slate-300">{check.message}</div>
                    {check.details && (
                      <div className="mt-1 text-xs text-slate-400 italic">{check.details}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {validationResult?.isValid && (
            <div className="mt-4 rounded-lg border border-emerald-700 bg-emerald-900/30 p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">✅</span>
                <span className="text-sm font-semibold text-emerald-300">Pipeline is ready to execute</span>
              </div>
            </div>
          )}
          {validationResult && !validationResult.isValid && (
            <div className="mt-4 rounded-lg border border-rose-700 bg-rose-900/30 p-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">❌</span>
                <span className="text-sm font-semibold text-rose-300">Please fix the errors above before executing</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-white">Quick Guide</h3>
          
          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-start gap-2">
              <span className="text-blue-400">1.</span>
              <span><span className="font-medium text-white">Source:</span> Where data comes from</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">2.</span>
              <span><span className="font-medium text-white">Transform:</span> Data processing & validation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-blue-400">3.</span>
              <span><span className="font-medium text-white">Destination:</span> Where results are saved</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
