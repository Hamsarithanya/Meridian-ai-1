import React from 'react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Compass,
  Layers,
  Loader2,
  AlertCircle,
  SearchCheck,
} from 'lucide-react';
import { AgentId, AgentTraceStep } from '../types';

interface AgentPipelinePanelProps {
  steps: AgentTraceStep[];
  isRunning: boolean;
  lastTrigger: string;
  adaptationReason: string;
  lastUpdated: string;
}

const AGENT_ICONS: Record<AgentId, React.ComponentType<{ className?: string }>> = {
  analyst: SearchCheck,
  matcher: Compass,
  architect: Layers,
  mentor: Bot,
};

const AGENT_STYLES: Record<
  AgentId,
  {
    iconBg: string;
    cardBg: string;
    titleColor: string;
  }
> = {
  analyst: {
    iconBg: 'bg-[#2563EB] text-white',
    cardBg: 'border-blue-200/80 bg-blue-50/35',
    titleColor: 'text-[#1D4ED8]',
  },
  matcher: {
    iconBg: 'bg-[#0D9488] text-white',
    cardBg: 'border-teal-200/80 bg-teal-50/35',
    titleColor: 'text-[#0F766E]',
  },
  architect: {
    iconBg: 'bg-[#4F46E5] text-white',
    cardBg: 'border-indigo-200/80 bg-indigo-50/35',
    titleColor: 'text-[#4338CA]',
  },
  mentor: {
    iconBg: 'bg-[#D97706] text-white',
    cardBg: 'border-amber-200/80 bg-amber-50/35',
    titleColor: 'text-[#B45309]',
  },
};

export const AgentPipelinePanel: React.FC<AgentPipelinePanelProps> = ({
  steps,
  isRunning,
  lastTrigger,
  adaptationReason,
  lastUpdated,
}) => {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-[#2563EB]">Multi-Agent Collaboration Pipeline</span>
            <span aria-hidden="true">·</span>
            <span>Last sync {lastUpdated}</span>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{lastTrigger}</h2>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          {isRunning ? (
            <span className="inline-flex items-center gap-1.5 text-[#2563EB]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Agents collaborating in real time
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[#059669]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pipeline synchronized
            </span>
          )}
        </div>
      </div>

      {/* 4-Agent Sequential Handoff Grid */}
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = AGENT_ICONS[step.agentId];
          const style = AGENT_STYLES[step.agentId];
          const isStepRunning = step.status === 'running';
          const isStepError = step.status === 'error';

          return (
            <div
              key={step.agentId}
              className={`relative flex flex-col justify-between rounded-lg border p-4 transition-colors ${
                isStepRunning
                  ? 'border-[#2563EB] bg-blue-50/70'
                  : isStepError
                    ? 'border-red-300 bg-red-50/40'
                    : style.cardBg
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg shadow-xs ${
                        isStepRunning
                          ? 'bg-[#2563EB] text-white'
                          : isStepError
                            ? 'bg-red-600 text-white'
                            : style.iconBg
                      }`}
                    >
                      {isStepRunning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : isStepError ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${style.titleColor}`}>
                        0{index + 1}. {step.agentName}
                      </div>
                      <div className="text-[11px] text-slate-600">{step.roleTitle}</div>
                    </div>
                  </div>

                  {step.durationMs > 0 && (
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {(step.durationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </div>

                <p className="mt-3 text-xs leading-relaxed text-slate-700">{step.summary}</p>

                {step.highlights.length > 0 && (
                  <ul className="mt-2.5 space-y-1 border-t border-slate-200/80 pt-2.5">
                    {step.highlights.map((h, i) => (
                      <li key={i} className="text-[11px] font-medium text-slate-700">
                        · {h}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex items-start gap-1.5 border-t border-slate-200/80 pt-2.5 text-[11px] text-slate-600">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                <span>{step.handoffNote}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explicit Adaptation Rationale */}
      <div className="mt-4 rounded-lg border border-blue-200/70 bg-blue-50/40 px-4 py-3 text-xs leading-relaxed text-slate-700">
        <span className="font-semibold text-[#1D4ED8]">Adaptation Decision: </span>
        {adaptationReason}
      </div>
    </section>
  );
};
