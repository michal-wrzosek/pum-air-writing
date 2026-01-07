/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useRef, useState } from "react";

export const Sensor = () => {
  const [permissionGranted, setPermissionGranted] = useState<boolean>();
  const [label, setLabel] = useState<string>("");
  const [active, setActive] = useState<boolean>(false);
  const dataRef = useRef<
    { x: number; y: number; z: number; msElapsedSinceStart: number }[]
  >([]);
  const startTimeRef = useRef<number>(0);

  const handleRequestPermission = useCallback(() => {
    (async () => {
      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        // iOS 13+ devices
        const permission = await (DeviceMotionEvent as any).requestPermission();
        if (permission === "granted") {
          setPermissionGranted(true);
        } else {
          setPermissionGranted(false);
        }
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
    if (!acc || !acc.x || !acc.y || !acc.z) return;

    dataRef.current.push({
      x: acc.x,
      y: acc.y,
      z: acc.z,
      msElapsedSinceStart: Date.now() - startTimeRef.current,
    });
  }, []);

  const handleStart = useCallback(async () => {
    dataRef.current = [];
    startTimeRef.current = Date.now();
    window.addEventListener("devicemotion", handleMotion);
    setActive(true);
  }, [handleMotion]);

  const handleEnd = useCallback(() => {
    window.removeEventListener("devicemotion", handleMotion);
    setActive(false);
    fetch("/api/send-sensor-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ label, data: dataRef.current }),
    });
  }, [handleMotion, label]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
      {typeof permissionGranted === "undefined" && (
        <button onClick={handleRequestPermission} className="border p-4">
          Request Sensor Permission
        </button>
      )}
      {permissionGranted === false && (
        <p className="text-red-500">Permission denied for sensor access.</p>
      )}
      {permissionGranted === true && (
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="What is being recorded?"
            id="label"
            value={label}
            onChange={handleLabelChange}
            className="border p-2"
          />
          <button
            onTouchStart={handleStart}
            onTouchEnd={handleEnd}
            className="border p-4 bg-blue-500 text-white rounded"
          >
            {active ? "Recording..." : "Hold to record motion"}
          </button>
        </div>
      )}
    </div>
  );
};
