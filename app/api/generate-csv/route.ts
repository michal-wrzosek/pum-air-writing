import fs from "fs";
import path from "path";
import { parse } from "json2csv";

type Point = {
  x: number;
  y: number;
  z: number;
  msElapsedSinceStart: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const isValidPoint = (p: any): p is Point =>
  p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  Number.isFinite(p.z) &&
  Number.isFinite(p.msElapsedSinceStart);

const resampleToNPoints = (data: Point[], targetPoints = 20): Point[] => {
  const clean = (data ?? []).filter(isValidPoint);

  if (clean.length === 0) {
    return Array.from({ length: targetPoints }, () => ({
      x: 0,
      y: 0,
      z: 0,
      msElapsedSinceStart: 0,
    }));
  }

  if (clean.length === 1) {
    const p = clean[0];
    return Array.from({ length: targetPoints }, (_, i) => ({
      x: p.x,
      y: p.y,
      z: p.z,
      msElapsedSinceStart: p.msElapsedSinceStart,
    }));
  }

  const lastIdx = clean.length - 1;

  // uniform resampling along index (simple + stable)
  const out: Point[] = [];
  for (let i = 0; i < targetPoints; i++) {
    const pos = (i * lastIdx) / (targetPoints - 1); // 0..lastIdx
    const left = Math.floor(pos);
    const right = Math.min(lastIdx, left + 1);
    const t = pos - left;

    const a = clean[left];
    const b = clean[right];

    out.push({
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      z: lerp(a.z, b.z, t),
      msElapsedSinceStart: Math.round(
        lerp(a.msElapsedSinceStart, b.msElapsedSinceStart, t)
      ),
    });
  }

  return out;
};

const normalizeToFirstPoint = (points: Point[]): Point[] => {
  if (!points.length) return points;
  const origin = points[0];
  return points.map((p) => ({
    ...p,
    x: p.x - origin.x,
    y: p.y - origin.y,
    z: p.z - origin.z,
  }));
};

const dist3 = (a: Point, b: Point) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const computeFeatures = (points: Point[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const zs = points.map((p) => p.z);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  let totalPath = 0;
  for (let i = 0; i < points.length - 1; i++)
    totalPath += dist3(points[i], points[i + 1]);

  const durationMs = Math.max(
    0,
    points[points.length - 1].msElapsedSinceStart -
      points[0].msElapsedSinceStart
  );

  const avgStep = points.length > 1 ? totalPath / (points.length - 1) : 0;

  return {
    duration_ms: durationMs,
    total_path_length: totalPath,
    avg_step_length: avgStep,
    range_x: maxX - minX,
    range_y: maxY - minY,
    range_z: maxZ - minZ,
  };
};

export async function GET() {
  try {
    const sensorDataDir = path.join(process.cwd(), "sensor-data");
    const datasetDir = path.join(sensorDataDir, "datasets");

    if (!fs.existsSync(datasetDir))
      fs.mkdirSync(datasetDir, { recursive: true });

    const files = fs
      .readdirSync(sensorDataDir, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith(".json"))
      .map((f) => f.name);

    const csvData: Array<Record<string, string | number>> = [];

    for (const file of files) {
      const filePath = path.join(sensorDataDir, file);
      const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      const label = String(jsonData.label ?? "");
      const raw: Point[] = Array.isArray(jsonData.data) ? jsonData.data : [];

      // 1) resample to 20 points
      const sampled = resampleToNPoints(raw, 20);

      // 2) normalize to first point (shape > position)
      const normalized = normalizeToFirstPoint(sampled);

      // 3) engineered features
      const features = computeFeatures(normalized);

      // 4) flatten points to numeric columns
      const row: Record<string, string | number> = { label, ...features };

      normalized.forEach((p, idx) => {
        const n = idx + 1;
        row[`p${n}_x`] = p.x;
        row[`p${n}_y`] = p.y;
        row[`p${n}_z`] = p.z;
        row[`p${n}_t`] = p.msElapsedSinceStart; // opcjonalne, ale często pomaga
      });

      csvData.push(row);
    }

    const csv = parse(csvData);

    const outputFilePath = path.join(datasetDir, "sensor-data.csv");
    fs.writeFileSync(outputFilePath, csv);

    return Response.json({ ok: true, rows: csvData.length });
  } catch (error: any) {
    return Response.json(
      { ok: false, error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
