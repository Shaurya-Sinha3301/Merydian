/* eslint-disable */
import React from 'react';
import { ExplanationDTO } from '@/types/dto';
import { Sparkles, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function ExplanationCard({ explanation }: { explanation: ExplanationDTO }) {
  if (!explanation) return null;

  return (
    <div className="bp-card rounded-xl p-5 border-l-4 border-l-[#d4c86a] bg-gradient-to-br from-white to-[#fcfcf9]">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-[#fcfcf9] rounded-full text-[#c5a065] shadow-sm mt-1">
          <Sparkles className="w-5 h-5" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {explanation.activity_changed}
          </h3>
          
          <p className="text-sm text-gray-700 mb-4 font-serif italic text-lg leading-relaxed">
            "{explanation.human_explanation}"
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div className="flex flex-col gap-1">
              <span className="bp-label">Technical Reason</span>
              <span className="text-sm text-gray-800">{explanation.reason}</span>
            </div>
            
            {(explanation.previous_value || explanation.new_value) && (
              <div className="flex flex-col gap-1">
                <span className="bp-label">Change</span>
                <div className="flex items-center gap-2 text-sm">
                  {explanation.previous_value && <span className="line-through text-gray-500">{explanation.previous_value}</span>}
                  {explanation.previous_value && explanation.new_value && <ArrowRight className="w-3 h-3 text-gray-400" />}
                  {explanation.new_value && <span className="font-medium text-gray-900">{explanation.new_value}</span>}
                </div>
              </div>
            )}
            
            {explanation.affected_constraints && explanation.affected_constraints.length > 0 && (
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="bp-label">Affected Constraints</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {explanation.affected_constraints.map((c, i) => (
                    <span key={i} className="bp-tag bg-gray-100 text-gray-600 border border-gray-200">
                      <ShieldAlert className="w-2.5 h-2.5 inline mr-1" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">AI Confidence</span>
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#d4c86a] to-[#8fa391]"
                  style={{ width: `${Math.max(10, explanation.confidence * 100)}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-700">{Math.round(explanation.confidence * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
