import React from 'react';
import { JobDTO } from '@/types/dto';
import { CheckCircle2, Clock, PlayCircle, Settings2, Sparkles, Server, FileText } from 'lucide-react';

const STAGES = [
  { id: 'PENDING', label: 'Queued', icon: <Clock className="w-4 h-4" /> },
  { id: 'UNDERSTANDING_FEEDBACK', label: 'Understanding feedback', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'GENERATING_CONSTRAINTS', label: 'Resolving constraints', icon: <Settings2 className="w-4 h-4" /> },
  { id: 'OPTIMIZING', label: 'Running optimizer', icon: <Server className="w-4 h-4" /> },
  { id: 'GENERATING_EXPLANATION', label: 'Generating explanation', icon: <FileText className="w-4 h-4" /> },
  { id: 'COMPLETED', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4" /> },
];

export function OptimizationProgress({ job }: { job: JobDTO }) {
  const currentStageIndex = STAGES.findIndex(s => s.id === job.current_stage);
  
  return (
    <div className="bp-card rounded-xl p-6 w-full max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimizing Itinerary</h3>
      <p className="text-sm text-gray-500 mb-6">{job.description}</p>
      
      <div className="relative">
        <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-gray-100"></div>
        <div className="space-y-6">
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentStageIndex || job.status === 'COMPLETED';
            const isCurrent = index === currentStageIndex && job.status !== 'COMPLETED';
            const isPending = index > currentStageIndex && job.status !== 'COMPLETED';
            
            return (
              <div key={stage.id} className="relative flex items-center gap-4">
                <div className={`z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white
                  ${isCompleted ? 'border-green-500 text-green-500' : ''}
                  ${isCurrent ? 'border-blue-500 text-blue-500' : ''}
                  ${isPending ? 'border-gray-200 text-gray-300' : ''}
                `}>
                  {isCurrent ? <PlayCircle className="w-4 h-4 animate-pulse" /> : 
                   isCompleted ? <CheckCircle2 className="w-4 h-4" /> : 
                   <div className="w-2 h-2 rounded-full bg-gray-200"></div>}
                </div>
                <div>
                  <span className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {job.status === 'FAILED' && (
        <div className="mt-6 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-100">
          Optimization failed: {job.description}
        </div>
      )}
    </div>
  );
}
