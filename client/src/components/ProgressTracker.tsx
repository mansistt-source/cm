import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";

export interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  progress?: number; // 0-100
}

interface ProgressTrackerProps {
  stages: PipelineStage[];
  currentStage?: string;
}

export default function ProgressTracker({ stages, currentStage }: ProgressTrackerProps) {
  const getStageIcon = (stage: PipelineStage) => {
    switch (stage.status) {
      case "completed":
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case "in_progress":
        return <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-6 h-6 text-red-400" />;
      default:
        return <Circle className="w-6 h-6 text-slate-500" />;
    }
  };

  const getStageColor = (stage: PipelineStage) => {
    switch (stage.status) {
      case "completed":
        return "border-green-500/30 bg-green-500/5";
      case "in_progress":
        return "border-blue-500/30 bg-blue-500/5";
      case "failed":
        return "border-red-500/30 bg-red-500/5";
      default:
        return "border-slate-700/50 bg-slate-800/50";
    }
  };

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div key={stage.id}>
          <Card className={`p-4 border transition-all ${getStageColor(stage)}`}>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 mt-1">{getStageIcon(stage)}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-white">{stage.name}</h4>
                  {stage.progress !== undefined && (
                    <span className="text-xs text-slate-400">{stage.progress}%</span>
                  )}
                </div>
                <p className="text-sm text-slate-400 mb-2">{stage.description}</p>
                {stage.progress !== undefined && (
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Connector line */}
          {index < stages.length - 1 && (
            <div className="flex justify-center py-1">
              <div className="w-0.5 h-3 bg-gradient-to-b from-slate-600 to-transparent" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
