import fs from "fs";
import path from "path";
import { parse } from "json2csv";

// Helper function to normalize data to 20 points
const normalizeData = (
  data: { x: number; y: number; z: number; msElapsedSinceStart: number }[],
  targetPoints = 20
) => {
  if (!data || data.length === 0) {
    return Array(targetPoints).fill({
      x: 0,
      y: 0,
      z: 0,
      msElapsedSinceStart: 0,
    });
  }

  const step = Math.max(1, Math.floor(data.length / targetPoints));
  const normalized = [];

  for (
    let i = 0;
    i < data.length && normalized.length < targetPoints;
    i += step
  ) {
    const point = data[i];
    if (
      point &&
      point.x !== undefined &&
      point.y !== undefined &&
      point.z !== undefined
    ) {
      normalized.push(point);
    }
  }

  // If fewer than targetPoints, pad with default values
  while (normalized.length < targetPoints) {
    normalized.push({ x: 0, y: 0, z: 0, msElapsedSinceStart: 0 });
  }

  return normalized;
};

export async function GET() {
  try {
    const sensorDataDir = path.join(process.cwd(), "sensor-data");
    const datasetDir = path.join(sensorDataDir, "datasets");

    // Ensure the dataset directory exists
    if (!fs.existsSync(datasetDir)) {
      fs.mkdirSync(datasetDir, { recursive: true });
    }

    // Read only top-level JSON files in the sensor-data directory
    const files = fs
      .readdirSync(sensorDataDir, { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith(".json"))
      .map((file) => file.name);

    const csvData: { label: string; [key: string]: number | string }[] = [];

    for (const file of files) {
      const filePath = path.join(sensorDataDir, file);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const jsonData = JSON.parse(fileContent);

      const label = jsonData.label;
      const data = normalizeData(jsonData.data);

      // Flatten the points into columns
      const row: { label: string; [key: string]: number | string } = { label };
      data.forEach((point, index) => {
        row[`point_${index + 1}`] = `${point.x},${point.y}`;
      });

      // Fill remaining columns with empty values if less than 20 points
      for (let i = data.length; i < 20; i++) {
        row[`point_${i + 1}`] = "";
      }

      csvData.push(row);
    }

    // Convert to CSV
    const csv = parse(csvData);

    // Write the CSV file to the datasets folder
    const outputFilePath = path.join(
      datasetDir,
      `sensor-data_${Date.now()}.csv`
    );
    fs.writeFileSync(outputFilePath, csv);

    // Respond with success
    return Response.json({
      message: "Dataset created successfully",
      path: outputFilePath,
    });
  } catch (error) {
    console.error("Error generating dataset:", error);
    return Response.json({ error: "Failed to generate dataset" });
  }
}
