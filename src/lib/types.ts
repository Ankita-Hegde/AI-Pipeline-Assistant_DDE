export type Role = 'admin' | 'engineer' | 'operator' | 'viewer';

// Pipeline lifecycle/status for dashboard grouping
// draft      – defined but not yet run or deployed
// running    – currently executing (or marked as in progress)
// active     – ready to run/last execution succeeded
// succeeded  – last known state is healthy/successful
// failed     – last known state failed
// deployed   – deployed to a live environment (optional extra state)
// archived   – no longer active
export type PipelineStatus =
  | 'draft'
  | 'running'
  | 'active'
  | 'succeeded'
  | 'failed'
  | 'deployed'
  | 'archived';

export type PipelineTrigger = 'manual' | 'scheduled' | 'event';

export interface PipelineStep {
  id: string;
  type: 'source' | 'transform' | 'destination';
  name: string;
  description?: string;
  config: Record<string, any>;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  ownerEmail: string;
  status: PipelineStatus;
  trigger: PipelineTrigger;
  schedule?: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  steps: PipelineStep[];
}

export type ExecutionStatus = 'running' | 'succeeded' | 'failed';

export interface PipelineExecutionMetrics {
  rowsProcessed: number;
  transformationsApplied: number;
  dataWritten: number;
  executionTime: number; // in milliseconds
}

export interface PipelineExecution {
  id: string;
  pipelineId: string;
  startedAt: string;
  finishedAt?: string;
  status: ExecutionStatus;
  logs: string[];
  metrics?: PipelineExecutionMetrics;
}

export interface UserSession {
  email: string;
  name: string;
  role: Role;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userEmail?: string;
  action: string;
  targetType?: 'pipeline' | 'execution' | 'system';
  targetId?: string;
  details?: any;
}