import React from "react";

export type TimelineState = "done" | "active" | "pending";

export interface TimelineStep {
  label: string;
  meta?: string;
  state: TimelineState;
  detail?: React.ReactNode;
}

const DOT: Record<TimelineState, string> = {
  done: "border-teal bg-teal",
  active: "border-aqua bg-aqua animate-pulse",
  pending: "border-line bg-bg-1",
};

const LABEL: Record<TimelineState, string> = {
  done: "text-ink",
  active: "text-ink",
  pending: "text-ink-faint",
};

interface TimelineProps {
  steps: TimelineStep[];
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ steps, className = "" }) => {
  return (
    <ol className={`flex flex-col ${className}`}>
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
            <div className="flex flex-col items-center">
              <span
                className={`mt-[3px] h-2.5 w-2.5 shrink-0 rounded-full border ${DOT[step.state]}`}
              />
              {!last && <span className="mt-1 w-px flex-1 bg-line" />}
            </div>
            <div className="min-w-0 pb-1 pt-px">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-title-sm ${LABEL[step.state]} ${step.state === "pending" ? "font-normal" : "font-semibold"}`}
                >
                  {step.label}
                </span>
                {step.meta && (
                  <span className="shrink-0 text-telemetry-sm text-ink-faint">
                    {step.meta}
                  </span>
                )}
              </div>
              {step.detail && <div className="mt-1">{step.detail}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
};