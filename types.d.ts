// Typing Sensor API (Accelerometer) for TypeScript

interface AccelerometerOptions {
  frequency?: number;
}

declare class Accelerometer extends EventTarget {
  constructor(options?: AccelerometerOptions);
  x: number;
  y: number;
  z: number;
  start(): void;
  stop(): void;
}
