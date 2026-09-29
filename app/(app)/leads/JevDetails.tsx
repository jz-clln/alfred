import type { JevAssessment } from "@/lib/leads/jev";

export function JevDetails({ assessment }: { assessment?: JevAssessment | null }) {
  if (!assessment) return null;
  return <details className="mt-2 text-xs text-ink-soft">
    <summary className="cursor-pointer">JEV assessment: {assessment.temperature} · {Math.round(assessment.confidence * 100)}% confidence</summary>
    <div className="mt-2 space-y-1">
      <p>Intent signal probabilities (likelihood of yes):</p>
      {Object.entries(assessment.signals).map(([key, value]) => <div key={key}>{key.replaceAll("_", " ")}: {Math.round(value * 100)}%</div>)}
      <p>Analyzed {assessment.analyzed_at.slice(0, 10)} · {assessment.model}</p>
      {assessment.confidence < 0.7 && <p>Low confidence. Review the conversation before setting a temperature.</p>}
    </div>
  </details>;
}
