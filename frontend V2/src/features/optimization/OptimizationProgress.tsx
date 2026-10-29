import { useState, useEffect } from 'react';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useJob } from '../../hooks/useJobs';
import type { PipelineStage, LogEntry } from '../../lib/types';

// Mock constants removed as we now use live data

interface OptimizationProgressProps {
  onNavigate: (page: string) => void;
}

export function OptimizationProgress({ onNavigate }: OptimizationProgressProps) {
  // Try to grab job_id from URL search params, fallback to a mock/test job ID if none exists.
  const searchJobId = new URLSearchParams(window.location.search).get('job_id');
  const jobId = searchJobId || localStorage.getItem('last_job_id') || '';
  const { data: job, isLoading, error } = useJob(jobId, 2000);

  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (job?.description) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogs(prev => {
        if (prev.length > 0 && prev[prev.length - 1].message === job.description) return prev;
        return [...prev, {
          timestamp: new Date().toLocaleTimeString(),
          level: job.status === 'FAILED' ? 'error' : 'info',
          message: job.description
        }];
      });
    }
  }, [job?.description, job?.status]);

  const progress = job?.progress_percentage ?? 0;
  const estSeconds = job?.estimated_remaining_seconds ?? 0;
  
  // Map backend stages to our UI stages
  const backendStage = job?.current_stage || 'PENDING';
  const currentStageIndex = ['PENDING', 'UNDERSTANDING_FEEDBACK', 'GENERATING_CONSTRAINTS', 'OPTIMIZING', 'GENERATING_EXPLANATION', 'COMPLETED'].indexOf(backendStage);
  
  const uiStages: PipelineStage[] = [
    { id: 's1', name: 'Parse itinerary', status: currentStageIndex >= 1 ? 'completed' : 'pending' },
    { id: 's2', name: 'Constraint extraction', status: currentStageIndex > 2 ? 'completed' : (currentStageIndex === 2 ? 'running' : 'pending') },
    { id: 's4', name: 'Optimization', status: currentStageIndex > 3 ? 'completed' : (currentStageIndex === 3 ? 'running' : 'pending') },
    { id: 's6', name: 'Explainability generation', status: currentStageIndex > 4 ? 'completed' : (currentStageIndex === 4 ? 'running' : 'pending') },
    { id: 's7', name: 'Human review ready', status: job?.status === 'COMPLETED' ? 'completed' : 'pending' },
  ];

  const completedStages = uiStages.filter(s => s.status === 'completed').length;

  if (!jobId) {
    return (
      <EmptyState
        title="No optimization running"
        description="Send feedback on your itinerary and the progress of the AI re-plan will appear here."
        action={{ label: 'Give feedback', onClick: () => onNavigate('feedback') }}
      />
    );
  }
  if (isLoading && !job) return <div className="p-8 text-center">Loading job status...</div>;
  if (error && !job) {
    return (
      <EmptyState
        title="Couldn't find that job"
        description="It may belong to a previous session. Start a new one by sending feedback."
        action={{ label: 'Give feedback', onClick: () => onNavigate('feedback') }}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
            Optimization Progress
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Job {jobId.slice(0, 8)}
          </p>
        </div>
        <StatusBadge status={job?.status === 'COMPLETED' ? 'approved' : job?.status === 'FAILED' ? 'failed' : 'running'} />
      </div>

      {/* Progress hero */}
      <Card padding="lg">
        <div className="flex items-center gap-12">
          <div className="shrink-0">
            <ProgressRing
              value={progress}
              size={140}
              strokeWidth={10}
              label={`${Math.round(progress)}%`}
              sublabel="complete"
              color="var(--primary)"
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold">
                  {job?.status === 'COMPLETED' ? 'Optimization complete' : job?.status === 'FAILED' ? 'Optimization failed' : 'Optimization running…'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  {completedStages} of {uiStages.length} stages complete
                  {progress < 100 && estSeconds > 0 && ` · Est. ${estSeconds}s remaining`}
                </p>
              </div>
              {progress >= 100 && (
                <Button variant="primary" size="md" onClick={() => onNavigate(job?.status === 'FAILED' ? 'feedback' : 'diff-viewer')}>
                  {job?.status === 'FAILED' ? 'Try again' : 'Review changes →'}
                </Button>
              )}
            </div>

            {/* Stage list */}
            <div className="space-y-2 mt-4">
              {uiStages.map(stage => (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                    {stage.status === 'completed' ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" fill="var(--success)" fillOpacity="0.15" stroke="var(--success)" strokeWidth="1.5" />
                        <path d="M5 8l2.5 2.5L11 5.5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : stage.status === 'running' ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" className="animate-spin">
                        <circle cx="8" cy="8" r="6" stroke="var(--primary)" strokeWidth="2" strokeDasharray="20" strokeDashoffset="8" fill="none" />
                      </svg>
                    ) : (
                      <div className="w-4 h-4 rounded-full" style={{ border: '1.5px solid var(--border)' }} />
                    )}
                  </div>
                  <span
                    className="text-xs flex-1"
                    style={{
                      color: stage.status === 'completed' ? 'var(--foreground)' : stage.status === 'running' ? 'var(--primary)' : 'var(--muted-foreground)',
                      fontWeight: stage.status === 'running' ? 600 : 400,
                    }}
                  >
                    {stage.name}
                  </span>
                  {stage.durationMs != null && (
                    <span className="text-[11px]" style={{ color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}>
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Log terminal */}
      <Card padding="none">
        <CardHeader className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <CardTitle>Optimization Log</CardTitle>
          <span className="text-[11px] font-mono" style={{ color: 'var(--muted-foreground)' }}>
            {logs.length} entries
          </span>
        </CardHeader>
        <div
          className="p-4 overflow-y-auto font-mono text-[11px] space-y-1.5"
          style={{ maxHeight: 280, backgroundColor: 'var(--background)' }}
        >
          {logs.map((log, i) => (
            <div key={i} className="flex items-start gap-3">
              <span style={{ color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{log.timestamp}</span>
              <span
                className="shrink-0 uppercase text-[9px] font-bold px-1 py-0.5 rounded"
                style={{
                  backgroundColor: log.level === 'error' ? 'color-mix(in srgb, var(--error) 15%, transparent)' : log.level === 'warn' ? 'color-mix(in srgb, var(--warning) 15%, transparent)' : 'color-mix(in srgb, var(--success) 15%, transparent)',
                  color: log.level === 'error' ? 'var(--error)' : log.level === 'warn' ? 'var(--warning)' : 'var(--success)',
                }}
              >
                {log.level}
              </span>
              <span style={{ color: 'var(--foreground)', wordBreak: 'break-all' }}>{log.message}</span>
            </div>
          ))}
          {job?.status !== 'COMPLETED' && job?.status !== 'FAILED' && (
            <div className="flex items-center gap-2 pt-1">
              <span style={{ color: 'var(--muted-foreground)' }}>{new Date().toLocaleTimeString()}</span>
              <span className="text-[9px] font-bold px-1 py-0.5 rounded uppercase" style={{ backgroundColor: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>info</span>
              <span style={{ color: 'var(--primary)' }}>
                Polling backend…
                <span className="animate-pulse">_</span>
              </span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
