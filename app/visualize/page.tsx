"use client";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Papa from "papaparse";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Gesture = {
  label: string;
  points: { x: number; y: number; z: number; t?: number }[];
};

const VisualizePage = () => {
  const [gestures, setGestures] = useState<Gesture[]>([]);
  const [labelFilter, setLabelFilter] = useState<string>("ALL");
  const [limit, setLimit] = useState<number>(50);

  const handleLoadDataset = async () => {
    try {
      const response = await fetch("/datasets/sensor-data.csv", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Failed to load dataset");

      const csvText = await response.text();
      const parsed = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (parsed.errors.length > 0) {
        console.error("CSV Parsing Errors:", parsed.errors);
        return;
      }

      const extracted: Gesture[] = [];

      (parsed.data ?? []).forEach((row) => {
        const label = (row["label"] ?? "Unknown").trim() || "Unknown";
        const points: Gesture["points"] = [];

        for (let i = 1; i <= 20; i++) {
          const x = Number(row[`p${i}_x`]);
          const y = Number(row[`p${i}_y`]);
          const z = Number(row[`p${i}_z`]);
          const tRaw = row[`p${i}_t`];
          const t = tRaw !== undefined ? Number(tRaw) : undefined;

          // Skip invalid points
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
            continue;

          points.push({ x, y, z, ...(Number.isFinite(t) ? { t } : {}) });
        }

        if (points.length > 0) extracted.push({ label, points });
      });

      setGestures(extracted);
    } catch (error) {
      console.error("Error loading dataset:", error);
    }
  };

  const availableLabels = useMemo(() => {
    const set = new Set(gestures.map((g) => g.label));
    return ["ALL", ...Array.from(set).sort()];
  }, [gestures]);

  const filteredGestures = useMemo(() => {
    const base =
      labelFilter === "ALL"
        ? gestures
        : gestures.filter((g) => g.label === labelFilter);
    return base.slice(0, Math.max(1, limit));
  }, [gestures, labelFilter, limit]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 w-full">
      <h1 className="text-2xl font-bold mb-4">Visualize Gestures</h1>

      <div className="flex flex-wrap gap-3 items-center mb-4">
        <button
          onClick={handleLoadDataset}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Load Dataset
        </button>

        <label className="flex items-center gap-2">
          <span className="text-sm">Label:</span>
          <select
            className="border rounded px-2 py-1"
            value={labelFilter}
            onChange={(e) => setLabelFilter(e.target.value)}
          >
            {availableLabels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-sm">Limit:</span>
          <input
            className="border rounded px-2 py-1 w-24"
            type="number"
            min={1}
            max={500}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>

        <div className="text-sm text-gray-600">
          Loaded: <b>{gestures.length}</b> • Showing:{" "}
          <b>{filteredGestures.length}</b>
        </div>
      </div>

      {filteredGestures.length > 0 && (
        <div className="w-full max-w-6xl">
          <Plot
            data={filteredGestures.map((gesture, index) => ({
              x: gesture.points.map((p) => p.x),
              y: gesture.points.map((p) => p.y),
              z: gesture.points.map((p) => p.z),
              mode: "markers+lines",
              type: "scatter3d",
              name: `${gesture.label} (#${index + 1})`,
              marker: { size: 4 },
              line: { width: 2 },
            }))}
            layout={{
              title: `3D Gesture Visualization${
                labelFilter === "ALL" ? "" : ` — ${labelFilter}`
              }`,
              scene: {
                xaxis: { title: "X" },
                yaxis: { title: "Y" },
                zaxis: { title: "Z" },
              },
              legend: { orientation: "h" },
              margin: { l: 0, r: 0, b: 0, t: 40 },
            }}
            style={{ width: "100%", height: "650px" }}
          />
        </div>
      )}
    </div>
  );
};

export default VisualizePage;
