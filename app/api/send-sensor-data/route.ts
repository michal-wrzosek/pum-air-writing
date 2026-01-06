// Next.js app/api/send-sensor-data/route.ts
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  const data = (await request.json()) as {
    label: string;
    readings: {
      x: number;
      y: number;
      z: number;
      msElapsedSinceStart: number;
    }[];
  };

  // write this data as a json file to the local filesystem. filename is <label>_<timestamp>.json
  const timestamp = Date.now();
  const filename = `${data.label}_${timestamp}.json`;
  const filepath = path.join(process.cwd(), "sensor-data", filename);

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(filepath), { recursive: true });

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

  // Here you can process the data as needed, e.g., store it in a database

  return NextResponse.json({ message: "Sensor data received successfully" });
}
