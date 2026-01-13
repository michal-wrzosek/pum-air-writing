"use client";
import { useEffect, useState } from "react";
import { buildDataikuPayload, RawPoint } from "@/app/components/gesturePayload";

export default function GesturePredict({
  points,
  autoRun = false,
}: {
  points: RawPoint[];
  autoRun?: boolean;
}) {
  const [pred, setPred] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    if (!points?.length) return;

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

      if (!r.ok)
        throw new Error(data?.message || data?.error || "Prediction failed");

      setPred(data?.result?.prediction ?? null);
    } catch (e: any) {
      setErr(e?.message ?? "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoRun) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, points]);

  // ✅ AUTO-RUN MODE: only big letter (no UI clutter)
  if (autoRun) {
    if (loading) {
      return (
        <div className="text-black text-[18vw] font-black leading-none select-none">
          …
        </div>
      );
    }
    if (err) {
      return <div className="text-red-400 text-2xl font-semibold">{err}</div>;
    }
    if (!pred) {
      return (
        <div className="text-black text-[12vw] font-black leading-none select-none">
          ?
        </div>
      );
    }
    return (
      <div className="text-black text-[35vw] font-black leading-none select-none">
        {String(pred).toUpperCase()}
      </div>
    );
  }

  // ✅ NORMAL MODE (debug page): keep button + details
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
