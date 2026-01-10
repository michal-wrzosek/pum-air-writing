/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useRef, useState } from "react";
import "./globals.css";
import GesturePredict from "@/lib/GesturePredict";

type RawPoint = {
  x: number;
  y: number;
  z: number;
  msElapsedSinceStart: number;
};

const simplifyTo2D = (data: RawPoint[]) => {
  // u Ciebie to de-facto zmiana osi, zostawiam jak było
  return data.map(({ x, y, z, msElapsedSinceStart }) => ({
    x,
    z,
    y,
    msElapsedSinceStart,
  }));
};

export const Sensor = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>();
  const [label, setLabel] = useState<string>("");
  const [active, setActive] = useState<boolean>(false);
  const [predictMode, setPredictMode] = useState(false);

  // NEW: punkty ostatniego gestu do predykcji
  const [lastPoints, setLastPoints] = useState<RawPoint[]>([]);
  const [showPredict, setShowPredict] = useState(false);

  const dataRef = useRef<RawPoint[]>([]);
  const startTimeRef = useRef<number>(0);

  const handleRequestPermission = useCallback(() => {
    (async () => {
      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        const permission = await (DeviceMotionEvent as any).requestPermission();
        setPermissionGranted(permission === "granted");
      } else {
        setPermissionGranted(true);
      }
    })();
  }, []);

  const handleLabelChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setLabel(event.target.value);
    },
    []
  );

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.acceleration;
    // UWAGA: u Ciebie było `!acc.x` itd. — to ucina zera. Zmieniam na Number.isFinite.
    if (!acc) return;

    const x = acc.x ?? 0;
    const y = acc.y ?? 0;
    const z = acc.z ?? 0;

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z))
      return;

    dataRef.current.push({
      x,
      y,
      z,
      msElapsedSinceStart: Date.now() - startTimeRef.current,
    });
  }, []);

  const startRecording = useCallback(() => {
    dataRef.current = [];
    startTimeRef.current = Date.now();
    window.addEventListener("devicemotion", handleMotion);
    setActive(true);
  }, [handleMotion]);

  const stopRecording = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setActive(false);

    const simplifiedData = simplifyTo2D(dataRef.current);
    return simplifiedData;
  }, [handleMotion]);

  // --- RECORD WITH LABEL (dataset) ---
  const handleStart = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleEnd = useCallback(() => {
    const simplifiedData = stopRecording();

    // Jeśli predictMode, to zamiast zapisu -> predykcja
    if (predictMode) {
      setLastPoints(simplifiedData);
      setShowPredict(true);
      return;
    }

    fetch("/api/send-sensor-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, data: simplifiedData }),
    });
  }, [stopRecording, label, predictMode]);

  // --- RECORD WITHOUT LABEL (id-only / raw storage) ---
  const handleStartWithoutLabel = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleEndWithoutLabel = useCallback(async () => {
    const simplifiedData = stopRecording();

    // predictMode -> predykcja
    if (predictMode) {
      setLastPoints(simplifiedData);
      setShowPredict(true);
      return;
    }

    const payload = { id: Date.now(), data: simplifiedData };

    try {
      const response = await fetch("/api/record-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) console.error("Failed to send data");
      else console.log("Data sent successfully");
    } catch (error) {
      console.error("Error sending data:", error);
    }
  }, [stopRecording, predictMode]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      <button
        onClick={() => {
          setPredictMode((v) => !v);
          setShowPredict(false);
        }}
        className="border px-3 py-2 rounded"
      >
        Predict mode: <b>{predictMode ? "ON" : "OFF"}</b>
      </button>

      {typeof permissionGranted === "undefined" && (
        <button onClick={handleRequestPermission} className="border p-4">
          Request Sensor Permission
        </button>
      )}

      {permissionGranted === false && (
        <p className="text-red-500">Permission denied for sensor access.</p>
      )}

      {permissionGranted === true && (
        <div className="flex flex-col gap-4 w-full max-w-md">
          {!predictMode && (
            <input
              type="text"
              placeholder="What is being recorded?"
              id="label"
              value={label}
              onChange={handleLabelChange}
              className="border p-2"
            />
          )}

          <button
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            className="border select-none p-4 bg-blue-500 text-white rounded"
          >
            {active
              ? "Recording..."
              : predictMode
              ? "Hold to record gesture (predict)"
              : "Hold to record motion"}
          </button>

          <button
            onTouchStart={handleStartWithoutLabel}
            onTouchEnd={handleEndWithoutLabel}
            className="border select-none p-4 bg-green-500 text-white rounded"
          >
            {active
              ? "Recording..."
              : predictMode
              ? "Hold to record gesture (predict)"
              : "Hold to record ID only"}
          </button>

          {/* NEW: wynik predykcji */}
          {predictMode && showPredict && (
            <div className="mt-2">
              <GesturePredict points={lastPoints} autoRun />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
