import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const payload = await req.json();
  const base = process.env.PY_MODEL_URL ?? "http://localhost:8000";

  const r = await fetch(`${base}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await r.json();
  return NextResponse.json(data, { status: r.status });
}
