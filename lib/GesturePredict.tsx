"use client";
import { useEffect, useState } from "react";
import { buildDataikuPayload, RawPoint } from "@/lib/gesturePayload";

export default function GesturePredict({
  points,
  autoRun,
}: {
  points: RawPoint[];
  autoRun: boolean;
}) {
  const [pred, setPred] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setErr(null);
    setPred(null);

    try {
      const payload = buildDataikuPayload(points);

      const r = await fetch("/api/gesture/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data?.message || data?.error || "Prediction failed");
      }

      // zgodnie z openapi: result.prediction
      setPred(data?.result?.prediction ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRun) run(); // gdzie run to funkcja odpalająca predykcję
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun]);

  return (
    <div className="p-4 border rounded w-full max-w-md">
      <button
        onClick={run}
        disabled={loading || points.length === 0}
        className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
      >
        {loading ? "Predicting..." : "Predict letter"}
      </button>

      <div className="mt-3 text-sm text-gray-600">
        Captured points: {points.length}
      </div>

      {pred && (
        <div className="mt-3 text-2xl">
          Predicted: <b>{pred}</b>
        </div>
      )}

      {err && <div className="mt-3 text-red-600">{err}</div>}
    </div>
  );
}
