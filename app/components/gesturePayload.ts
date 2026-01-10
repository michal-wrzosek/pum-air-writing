export type RawPoint = {
  x: number;
  y: number;
  z: number;
  msElapsedSinceStart: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const resampleToN = (data: RawPoint[], n = 20): RawPoint[] => {
  const clean = (data ?? []).filter(
    (p) =>
      Number.isFinite(p.x) &&
      Number.isFinite(p.y) &&
      Number.isFinite(p.z) &&
      Number.isFinite(p.msElapsedSinceStart)
  );

  if (clean.length === 0) {
    return Array.from({ length: n }, () => ({
      x: 0,
      y: 0,
      z: 0,
      msElapsedSinceStart: 0,
    }));
  }
  if (clean.length === 1) {
    return Array.from({ length: n }, () => ({ ...clean[0] }));
  }

  const last = clean.length - 1;
  const out: RawPoint[] = [];

  for (let i = 0; i < n; i++) {
    const pos = (i * last) / (n - 1);
    const left = Math.floor(pos);
    const right = Math.min(last, left + 1);
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

const normalizeToFirst = (points: RawPoint[]) => {
  const o = points[0] ?? { x: 0, y: 0, z: 0, msElapsedSinceStart: 0 };
  return points.map((p) => ({
    ...p,
    x: p.x - o.x,
    y: p.y - o.y,
    z: p.z - o.z,
  }));
};

const dist3 = (a: RawPoint, b: RawPoint) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

const computeAgg = (points: RawPoint[]) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const zs = points.map((p) => p.z);

  const range_x = Math.max(...xs) - Math.min(...xs);
  const range_y = Math.max(...ys) - Math.min(...ys);
  const range_z = Math.max(...zs) - Math.min(...zs);

  let total_path_length = 0;
  for (let i = 0; i < points.length - 1; i++)
    total_path_length += dist3(points[i], points[i + 1]);

  const duration_ms = Math.max(
    0,
    points[points.length - 1].msElapsedSinceStart -
      points[0].msElapsedSinceStart
  );

  const avg_step_length =
    points.length > 1 ? total_path_length / (points.length - 1) : 0;

  return {
    duration_ms,
    total_path_length,
    avg_step_length,
    range_x,
    range_y,
    range_z,
  };
};

export const buildDataikuPayload = (rawPoints: RawPoint[]) => {
  const sampled = resampleToN(rawPoints, 20);
  const norm = normalizeToFirst(sampled);
  const agg = computeAgg(norm);

  const features: Record<string, number> = { ...agg };

  norm.forEach((p, idx) => {
    const i = idx + 1;
    features[`p${i}_x`] = p.x;
    features[`p${i}_y`] = p.y;
    features[`p${i}_z`] = p.z;
    features[`p${i}_t`] = p.msElapsedSinceStart;
  });

  return { features };
};
