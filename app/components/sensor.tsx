/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useRef, useState } from "react";
import "./../globals.css";
import GesturePredict from "@/app/components/gesture-predict";

type RawPoint = {
  x: number;
  y: number;
  z: number;
  msElapsedSinceStart: number;
};

const simplifyTo2D = (data: RawPoint[]) => {
  // zachowuję Twoją zamianę osi
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
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setLabel(event.target.value),
    []
  );

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.acceleration;
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
    return simplifyTo2D(dataRef.current);
  }, [handleMotion]);

  const handleStart = useCallback(() => {
    startRecording();
  }, [startRecording]);

  const handleEnd = useCallback(() => {
    const simplifiedData = stopRecording();

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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* Big prediction overlay */}
      {predictMode && showPredict && (
        <div className=" flex items-center justify-center ">
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-white text-[35vw] leading-none font-black select-none">
              <GesturePredict points={lastPoints} autoRun />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <button
          onClick={() => {
            setPredictMode((v) => !v);
            setShowPredict(false);
          }}
          className="border px-3 py-2 rounded w-full"
        >
          Predict mode: <b>{predictMode ? "ON" : "OFF"}</b>
        </button>

        {typeof permissionGranted === "undefined" && (
          <button
            onClick={handleRequestPermission}
            className="border p-4 w-full"
          >
            Request Sensor Permission
          </button>
        )}

        {permissionGranted === false && (
          <p className="text-red-500">Permission denied for sensor access.</p>
        )}

        {permissionGranted === true && (
          <>
            {!predictMode && (
              <input
                type="text"
                placeholder="What is being recorded?"
                id="label"
                value={label}
                onChange={handleLabelChange}
                className="border p-2 w-full"
              />
            )}

            <button
              onTouchStart={handleStart}
              onTouchEnd={handleEnd}
              className="border select-none p-4 bg-blue-500 text-white rounded w-full"
            >
              {active
                ? "Recording..."
                : predictMode
                ? "Hold to record gesture (predict)"
                : "Hold to record motion"}
            </button>

            {predictMode && (
              <p className="text-sm text-gray-600 text-center">
                After releasing the button, the predicted letter will show
                full-screen.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
