import { Pipeline, PipelineExecution, AuditLogEntry } from './types';
import fs from 'fs';
import path from 'path';

let pipelines: Pipeline[] = [];
let executions: PipelineExecution[] = [];
let auditLogs: AuditLogEntry[] = [];
let isLoaded = false;

const DATA_DIR = path.join(process.cwd(), 'data');
const PIPELINES_FILE = path.join(DATA_DIR, 'pipelines.json');
const EXECUTIONS_FILE = path.join(DATA_DIR, 'executions.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit.json');

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

function loadOnce() {
  if (isLoaded) return;
  isLoaded = true;
  
  ensureDataDir();
  try {
    if (fs.existsSync(PIPELINES_FILE)) {
      const data = fs.readFileSync(PIPELINES_FILE, 'utf-8');
      pipelines = JSON.parse(data) as Pipeline[];
    }
  } catch (error) {
    console.error('Error loading pipelines:', error);
    pipelines = [];
  }
  try {
    if (fs.existsSync(EXECUTIONS_FILE)) {
      const data = fs.readFileSync(EXECUTIONS_FILE, 'utf-8');
      executions = JSON.parse(data) as PipelineExecution[];
    }
  } catch (error) {
    console.error('Error loading executions:', error);
    executions = [];
  }
  try {
    if (fs.existsSync(AUDIT_FILE)) {
      const data = fs.readFileSync(AUDIT_FILE, 'utf-8');
      auditLogs = JSON.parse(data) as AuditLogEntry[];
    }
  } catch (error) {
    console.error('Error loading audit logs:', error);
    auditLogs = [];
  }
}

function persist() {
  try {
    ensureDataDir();
    fs.writeFileSync(PIPELINES_FILE, JSON.stringify(pipelines, null, 2), 'utf-8');
    fs.writeFileSync(EXECUTIONS_FILE, JSON.stringify(executions, null, 2), 'utf-8');
    fs.writeFileSync(AUDIT_FILE, JSON.stringify(auditLogs, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error persisting data:', error);
  }
}

export function listPipelines(): Pipeline[] {
  try {
    loadOnce();
    return pipelines.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch (error) {
    console.error('Error listing pipelines:', error);
    return [];
  }
}

export function getPipeline(id: string): Pipeline | undefined {
  try {
    loadOnce();
    return pipelines.find((p) => p.id === id);
  } catch (error) {
    console.error('Error getting pipeline:', error);
    return undefined;
  }
}

export function savePipeline(pipeline: Pipeline): Pipeline {
  try {
    loadOnce();
    const existingIndex = pipelines.findIndex((p) => p.id === pipeline.id);
    const now = new Date().toISOString();
    
    if (existingIndex >= 0) {
      const current = pipelines[existingIndex];
      pipelines[existingIndex] = {
        ...pipeline,
        version: (current.version ?? 1) + 1,
        updatedAt: now,
      };
    } else {
      pipelines.push({ ...pipeline, version: pipeline.version ?? 1, updatedAt: now });
    }
    persist();
    return pipelines[existingIndex >= 0 ? existingIndex : pipelines.length - 1];
  } catch (error) {
    console.error('Error saving pipeline:', error);
    return pipeline;
  }
}

export function deletePipeline(id: string): void {
  try {
    loadOnce();
    pipelines = pipelines.filter((p) => p.id !== id);
    executions = executions.filter((e) => e.pipelineId !== id);
    persist();
  } catch (error) {
    console.error('Error deleting pipeline:', error);
  }
}

export function listExecutions(pipelineId?: string): PipelineExecution[] {
  try {
    loadOnce();
    const filtered = pipelineId
      ? executions.filter((e) => e.pipelineId === pipelineId)
      : executions;
    return filtered.slice().sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  } catch (error) {
    console.error('Error listing executions:', error);
    return [];
  }
}

export function getExecution(id: string): PipelineExecution | undefined {
  try {
    loadOnce();
    return executions.find((e) => e.id === id);
  } catch (error) {
    console.error('Error getting execution:', error);
    return undefined;
  }
}

export function saveExecution(execution: PipelineExecution): PipelineExecution {
  try {
    loadOnce();
    const existingIndex = executions.findIndex((e) => e.id === execution.id);
    if (existingIndex >= 0) {
      executions[existingIndex] = execution;
    } else {
      executions.push(execution);
    }
    persist();
    return execution;
  } catch (error) {
    console.error('Error saving execution:', error);
    return execution;
  }
}

export function listAuditLogs(): AuditLogEntry[] {
  loadOnce();
  return auditLogs.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function saveAuditLog(entry: AuditLogEntry): AuditLogEntry {
  loadOnce();
  auditLogs.push(entry);
  persist();
  return entry;
}