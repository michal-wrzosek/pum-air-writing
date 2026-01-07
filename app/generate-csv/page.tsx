"use client";
import { useState } from "react";

const GenerateCSV = () => {
  const [loading, setLoading] = useState(false);

  const handleGenerateCSV = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/generate-csv");
      if (response.ok) {
        console.log("File created!");
      } else {
        console.error("Failed to generate CSV");
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Generate Sensor Data CSV</h1>
      <button
        onClick={handleGenerateCSV}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? "Generating..." : "Generate CSV"}
      </button>
    </div>
  );
};

export default GenerateCSV;
