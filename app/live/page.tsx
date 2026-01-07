"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import dynamic from "next/dynamic";
import {
  ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function LivePage() {
  const [permissionGranted, setPermissionGranted] = useState<boolean>();
  const [isRecording, setIsRecording] = useState(false);
  const [data, setData] = useState<
    {
      x: number;
      y: number;
      z: number;
      alpha: number;
      beta: number;
      gamma: number;
      msElapsedSinceStart: number;
    }[]
  >([]);
  const startTimeRef = useRef<number>(0);
  const handleMotionRef = useRef<((event: DeviceMotionEvent) => void) | null>(
    null
  );
  const orientationRef = useRef({ alpha: 0, beta: 0, gamma: 0 });

  const handleRequestPermission = useCallback(() => {
    (async () => {
      if (
        typeof DeviceMotionEvent !== "undefined" &&
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        const motionPermission = await (
          DeviceMotionEvent as any
        ).requestPermission();

        // Also request orientation permission on iOS
        let orientationPermission = "granted";
        if (
          typeof DeviceOrientationEvent !== "undefined" &&
          typeof (DeviceOrientationEvent as any).requestPermission ===
            "function"
        ) {
          orientationPermission = await (
            DeviceOrientationEvent as any
          ).requestPermission();
        }

        if (
          motionPermission === "granted" &&
          orientationPermission === "granted"
        ) {
          setPermissionGranted(true);
        } else {
          setPermissionGranted(false);
        }
      } else {
        setPermissionGranted(true);
      }
    })();
  }, []);

  // Track orientation
  useEffect(() => {
    const handleOrientation = (event: DeviceOrientationEvent) => {
      orientationRef.current = {
        alpha: event.alpha || 0,
        beta: event.beta || 0,
        gamma: event.gamma || 0,
      };
    };

    window.addEventListener("deviceorientation", handleOrientation);
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const acc = event.acceleration;
    if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

    const dataPoint = {
      x: Math.abs(acc.x) < 0.5 ? 0 : acc.x,
      y: Math.abs(acc.y) < 0.5 ? 0 : acc.y,
      z: Math.abs(acc.z) < 0.5 ? 0 : acc.z,
      alpha: orientationRef.current.alpha,
      beta: orientationRef.current.beta,
      gamma: orientationRef.current.gamma,
      msElapsedSinceStart: Date.now() - startTimeRef.current,
    };

    setData((prev) => [...prev, dataPoint]);
  }, []);

  const handleStart = useCallback(() => {
    setData([]);
    startTimeRef.current = Date.now();
    setIsRecording(true);
    window.addEventListener("devicemotion", handleMotion);
  }, [handleMotion]);

  const handleStop = useCallback(() => {
    setIsRecording(false);
    window.removeEventListener("devicemotion", handleMotion);
  }, [handleMotion]);

  useEffect(() => {
    handleMotionRef.current = handleMotion;
    return () => {
      if (handleMotionRef.current) {
        window.removeEventListener("devicemotion", handleMotionRef.current);
      }
    };
  }, [handleMotion]);

  const positions = (() => {
    if (data.length === 0) return [{ x: 0, y: 0, z: 0 }];

    const velocity = { x: 0, y: 0, z: 0 };
    const position = { x: 0, y: 0, z: 0 };
    const result = [{ x: 0, y: 0, z: 0 }];

    // Thresholds
    const ACCEL_THRESHOLD = 0.1; // m/s² - below this, consider stationary
    const VELOCITY_DAMPING = 0.95; // Apply friction to velocity

    // Function to transform device coordinates to world coordinates
    const transformToWorld = (
      x: number,
      y: number,
      z: number,
      alpha: number,
      beta: number,
      gamma: number
    ) => {
      // Convert degrees to radians
      const alphaRad = (alpha * Math.PI) / 180;
      const betaRad = (beta * Math.PI) / 180;
      const gammaRad = (gamma * Math.PI) / 180;

      // Rotation matrix: Rz(alpha) * Rx(beta) * Ry(gamma)
      // Simplified rotation transformation
      const cosAlpha = Math.cos(alphaRad);
      const sinAlpha = Math.sin(alphaRad);
      const cosBeta = Math.cos(betaRad);
      const sinBeta = Math.sin(betaRad);
      const cosGamma = Math.cos(gammaRad);
      const sinGamma = Math.sin(gammaRad);

      // Apply rotation matrices
      const x1 =
        x * cosAlpha * cosGamma - y * cosAlpha * sinGamma + z * sinAlpha;
      const y1 =
        x * (sinAlpha * sinBeta * cosGamma + cosBeta * sinGamma) +
        y * (-sinAlpha * sinBeta * sinGamma + cosBeta * cosGamma) -
        z * sinBeta * cosAlpha;
      const z1 =
        x * (-sinAlpha * cosBeta * cosGamma + sinBeta * sinGamma) +
        y * (sinAlpha * cosBeta * sinGamma + sinBeta * cosGamma) +
        z * cosBeta * cosAlpha;

      return { x: x1, y: y1, z: z1 };
    };

    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];

      // Time delta in seconds
      const dt =
        (current.msElapsedSinceStart - previous.msElapsedSinceStart) / 1000;

      // Transform acceleration from device to world coordinates
      const worldAccel = transformToWorld(
        current.x,
        current.y,
        current.z,
        current.alpha,
        current.beta,
        current.gamma
      );

      // Calculate acceleration magnitude
      const accelMagnitude = Math.sqrt(
        worldAccel.x * worldAccel.x +
          worldAccel.y * worldAccel.y +
          worldAccel.z * worldAccel.z
      );

      // If acceleration is very small, assume stationary and reset velocity
      if (accelMagnitude < ACCEL_THRESHOLD) {
        velocity.x = 0;
        velocity.y = 0;
        velocity.z = 0;
      } else {
        // Integrate acceleration to get velocity (v = v0 + a*dt)
        velocity.x += worldAccel.x * dt;
        velocity.y += worldAccel.y * dt;
        velocity.z += worldAccel.z * dt;

        // Apply damping to velocity (simulates friction/air resistance)
        velocity.x *= VELOCITY_DAMPING;
        velocity.y *= VELOCITY_DAMPING;
        velocity.z *= VELOCITY_DAMPING;
      }

      // Integrate velocity to get position (p = p0 + v*dt)
      position.x += velocity.x * dt;
      position.y += velocity.y * dt;
      position.z += velocity.z * dt;

      result.push({ ...position });
    }

    return result;
  })();

  const plotData: ComponentProps<typeof Plot>["data"] = [
    {
      x: positions.map((p) => p.x),
      y: positions.map((p) => p.y),
      z: positions.map((p) => p.z),
      mode: "lines+markers",
      type: "scatter3d",
      line: {
        width: 2,
        color: "blue",
      },
      marker: {
        size: positions.map((_, i) => (i === 0 ? 10 : 1)),
        color: "red",
      },
      name: "Live Motion",
    },
  ];

  const layout: ComponentProps<typeof Plot>["layout"] = {
    title: { text: `Live 3D Position Tracking (${data.length} points)` },
    scene: {
      xaxis: { title: { text: "X Position (m)" } },
      yaxis: { title: { text: "Y Position (m)" } },
      zaxis: { title: { text: "Z Position (m)" } },
    },
    autosize: true,
  };

  return (
    <div className="w-screen h-screen flex flex-col">
      <div className="p-4 bg-gray-100 flex gap-4 items-center justify-center">
        {typeof permissionGranted === "undefined" && (
          <button
            onClick={handleRequestPermission}
            className="border p-4 bg-blue-500 text-white rounded"
          >
            Request Sensor Permission
          </button>
        )}
        {permissionGranted === false && (
          <p className="text-red-500">Permission denied for sensor access.</p>
        )}
        {permissionGranted === true && (
          <>
            <button
              onClick={handleStart}
              disabled={isRecording}
              className="border p-4 bg-green-500 text-white rounded disabled:opacity-50"
            >
              Start Recording
            </button>
            <button
              onClick={handleStop}
              disabled={!isRecording}
              className="border p-4 bg-red-500 text-white rounded disabled:opacity-50"
            >
              Stop Recording
            </button>
            <button
              onClick={() => setData([])}
              disabled={isRecording}
              className="border p-4 bg-gray-500 text-white rounded disabled:opacity-50"
            >
              Clear
            </button>
            {isRecording && (
              <span className="text-red-600 font-bold animate-pulse">
                ● Recording...
              </span>
            )}
          </>
        )}
      </div>
      {data.length > 0 && (
        <div className="p-4 bg-blue-50 flex gap-6 justify-center font-mono text-black">
          <div>
            X:{" "}
            <span className="font-bold">
              {data[data.length - 1].x.toFixed(3)}
            </span>{" "}
            m/s²
          </div>
          <div>
            Y:{" "}
            <span className="font-bold">
              {data[data.length - 1].y.toFixed(3)}
            </span>{" "}
            m/s²
          </div>
          <div>
            Z:{" "}
            <span className="font-bold">
              {data[data.length - 1].z.toFixed(3)}
            </span>{" "}
            m/s²
          </div>
        </div>
      )}
      <div className="flex-1">
        <Plot
          data={plotData}
          layout={layout}
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
