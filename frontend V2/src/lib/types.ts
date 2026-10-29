export type TripStatus = 'active' | 'completed' | 'cancelled' | 'draft';
export type OptimizationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'awaiting_approval';
export type ActivityType = 'transport' | 'hotel' | 'meal' | 'activity';
export type UserRole = 'customer' | 'agent' | 'admin';

export interface Traveler {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  travelers: Traveler[];
  budget: {
    total: number;
    spent: number;
    currency: string;
    breakdown: {
      flights: number;
      hotels: number;
      activities: number;
      meals: number;
    };
  };
  optimizationHealth: number; // 0–100
  lastOptimizedAt?: string;
}

export interface TimelineActivity {
  id: string;
  type: ActivityType;
  title: string;
  provider?: string;
  location?: string;
  startTime: string;
  endTime: string;
  cost?: number;
  currency?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  warnings?: string[];
  notes?: string;
}

export interface TimelineDay {
  date: string;
  activities: TimelineActivity[];
}

export interface DiffChange {
  id: string;
  type: ActivityType;
  field: string;
  previousValue: string;
  updatedValue: string;
  reason: string;
  impact: {
    costDelta?: number;
    timeDelta?: number; // minutes
    comfortScore?: number;
    currency?: string;
  };
  tags: string[];
  confidence?: number;
}

export interface Constraint {
  id: string;
  label: string;
  value: string;
  type: 'hard' | 'soft';
}

export interface ExplanationStep {
  id: string;
  title: string;
  description: string;
  stepType: 'analysis' | 'constraint_check' | 'scoring' | 'selection' | 'validation';
}

export interface Optimization {
  id: string;
  tripId: string;
  tripName: string;
  status: OptimizationStatus;
  confidence: number; // 0–100
  startedAt: string;
  completedAt?: string;
  estimatedCompletionAt?: string;
  summary: string;
  changes: DiffChange[];
  constraints: Constraint[];
  explanation: string;
  reasoningSteps: ExplanationStep[];
  pipelineStages: PipelineStage[];
  logs: LogEntry[];
  agentId?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  durationMs?: number;
  startedAt?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface Feedback {
  id: string;
  tripId: string;
  optimizationId: string;
  userId: string;
  type: 'accepted' | 'rejected' | 'modification_requested';
  comment?: string;
  preferences: {
    budgetPriority: number; // 0–100
    comfortVsCost: number; // 0=cost, 100=comfort
    pace: number; // 0=relaxed, 100=packed
  };
  createdAt: string;
}

export interface AgentJob {
  id: string;
  tripId: string;
  tripName: string;
  customerName: string;
  optimizationId: string;
  status: OptimizationStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  estimatedCompletionAt?: string;
  confidence?: number;
}

export interface ActivityFeedItem {
  id: string;
  type: 'optimization_completed' | 'approval_required' | 'feedback_received' | 'trip_created' | 'optimization_started';
  title: string;
  description: string;
  timestamp: string;
  tripId?: string;
  optimizationId?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  organizationName?: string;
}

export interface MetricSnapshot {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
}
