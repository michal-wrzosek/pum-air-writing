import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const baseUrl = process.env.DATAIKU_BASE_URL;
    const serviceId = process.env.DATAIKU_SERVICE_ID;
    const endpointId = process.env.DATAIKU_ENDPOINT_ID;

    if (!baseUrl || !serviceId || !endpointId) {
      return NextResponse.json(
        { ok: false, message: "Missing DATAIKU_* env vars" },
        { status: 500 }
      );
    }

    const url = `${baseUrl.replace(
      /\/$/,
      ""
    )}/public/api/v1/${serviceId}/${endpointId}/predict`;
    console.log({ baseUrl, url, serviceId, endpointId });

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await r.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    return NextResponse.json(data, { status: r.status });
  } catch (e: any) {
    console.log("Error!", e);
    return NextResponse.json(
      { ok: false, message: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
