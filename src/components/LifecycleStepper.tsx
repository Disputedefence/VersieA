import React from 'react';
import { AlertTriangle, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import type { LifecyclePhase, CaseOverviewData } from '../hooks/useCaseOverview';

const PHASES: { key: LifecyclePhase; label: string }[] = [
  { key: 'open', label: 'OPEN' },
  { key: 'evidence', label: 'EVIDENCE' },
  { key: 'submitted', label: 'SUBMITTED' },
  { key: 'escalation', label: 'ESCALATION' },
  { key: 'outcome', label: 'OUTCOME' },
];

function phaseIndex(phase: LifecyclePhase): number {
  return PHASES.findIndex((p) => p.key === phase);
}

function formatDeadline(iso: string | null): string {
  if (!iso) return 'Geen deadline';
  const deadline = new Date(iso);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();

  if (diffMs <= 0) return 'VERLOPEN';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} dag${days > 1 ? 'en' : ''} resterend`;
  return `${hours} uur resterend`;
}

interface LifecycleStepperProps {
  data: CaseOverviewData;
  isDarkMode: boolean;
}

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({
  data,
  isDarkMode,
}) => {
  const currentIdx = phaseIndex(data.lifecycle_phase);
  const deadlineText = formatDeadline(data.current_deadline);
  const isExpired = deadlineText === 'VERLOPEN';

  return (
    <div className="space-y-4">
      {/* Stepper bar */}
      <div className="w-full overflow-x-auto pb-2">
        <div className="flex items-center justify-between relative min-w-[480px] px-2">
          {/* Background line */}
          <div
            className={`absolute top-1/2 left-4 right-4 h-1 -translate-y-1/2 rounded ${
              isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
            }`}
          />
          {/* Progress line */}
          {currentIdx > 0 && (
            <div
              className="absolute top-1/2 left-4 h-1 -translate-y-1/2 rounded bg-[#FF6D00] transition-all duration-500"
              style={{
                width: `${(currentIdx / (PHASES.length - 1)) * 100}%`,
                maxWidth: 'calc(100% - 2rem)',
              }}
            />
          )}

          {PHASES.map((phase, idx) => {
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isFuture = idx > currentIdx;

            return (
              <div
                key={phase.key}
                className="relative z-10 flex flex-col items-center"
              >
                {/* Dot / circle */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    isCompleted
                      ? 'bg-[#FF6D00] border-[#FF6D00] text-white'
                      : isCurrent
                        ? 'bg-[#FF6D00] border-[#FF6D00] text-white ring-4 ring-[#FF6D00]/20'
                        : isFuture
                          ? isDarkMode
                            ? 'bg-[#2C2C2C] border-[#3E3E3E] text-[#A0A0A0]'
                            : 'bg-white border-slate-200 text-slate-400'
                          : ''
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : isCurrent ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <span className="text-[10px]">{idx + 1}</span>
                  )}
                </div>
                {/* Label */}
                <span
                  className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
                    isCompleted || isCurrent
                      ? 'text-[#FF6D00]'
                      : isDarkMode
                        ? 'text-[#A0A0A0]'
                        : 'text-slate-400'
                  }`}
                >
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Deadline + Urgency row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Deadline badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            isExpired
              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
              : isDarkMode
                ? 'bg-[#2C2C2C] border border-[#3E3E3E] text-[#A0A0A0]'
                : 'bg-slate-100 border border-slate-200 text-slate-600'
          }`}
        >
          <Clock size={14} />
          <span>Deadline: {deadlineText}</span>
        </div>

        {/* Urgency badge */}
        {data.is_urgent && data.urgency_reason && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle size={14} />
            <span>{data.urgency_reason}</span>
          </div>
        )}

        {/* Submittable indicator */}
        {data.is_submittable && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={14} />
            <span>Klaar om in te dienen</span>
          </div>
        )}
      </div>

      {/* Evidence progress mini-bar */}
      {data.evidence.length > 0 && (
        <div
          className={`p-3 rounded-lg border ${
            isDarkMode
              ? 'bg-[#2C2C2C] border-[#3E3E3E]'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                isDarkMode ? 'text-[#A0A0A0]' : 'text-slate-500'
              }`}
            >
              Bewijs voortgang
            </span>
            <span
              className={`text-xs font-mono ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              {data.evidence.filter((e) => e.status === 'uploaded').length}/
              {data.evidence.length}
            </span>
          </div>
          <div
            className={`w-full h-2 rounded-full ${
              isDarkMode ? 'bg-[#3E3E3E]' : 'bg-slate-200'
            }`}
          >
            <div
              className="h-2 rounded-full bg-[#FF6D00] transition-all duration-500"
              style={{
                width: `${
                  (data.evidence.filter((e) => e.status === 'uploaded').length /
                    data.evidence.length) *
                  100
                }%`,
              }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.evidence.map((ev) => (
              <span
                key={ev.evidence_type}
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  ev.status === 'uploaded'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : ev.is_required
                      ? 'bg-red-500/10 text-red-400'
                      : isDarkMode
                        ? 'bg-[#3E3E3E] text-[#A0A0A0]'
                        : 'bg-slate-100 text-slate-500'
                }`}
              >
                {ev.display_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
