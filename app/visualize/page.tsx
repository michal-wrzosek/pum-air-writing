"use client";
import dynamic from "next/dynamic";
import { ComponentProps, useMemo } from "react";
import dataA0 from "@/sensor-data/a_1767790859614.json";
import dataA1 from "@/sensor-data/a_1767790861573.json";
import dataA2 from "@/sensor-data/a_1767790863621.json";
import dataA3 from "@/sensor-data/a_1767790865812.json";
import dataA4 from "@/sensor-data/a_1767790870742.json";

import dataB0 from "@/sensor-data/b_1767790876318.json";
import dataB1 from "@/sensor-data/b_1767790878163.json";
import dataB2 from "@/sensor-data/b_1767790879799.json";
import dataB3 from "@/sensor-data/b_1767790881564.json";
import dataB4 from "@/sensor-data/b_1767790889528.json";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// readings including gravity
// import dataA0 from "@/sensor-data/a_1767732095034.json";
// import dataA1 from "@/sensor-data/a_1767732093193.json";
// import dataA2 from "@/sensor-data/a_1767732091308.json";
// import dataA3 from "@/sensor-data/a_1767732089542.json";
// import dataA4 from "@/sensor-data/a_1767732087753.json";
// import dataA5 from "@/sensor-data/a_1767732085923.json";
// import dataA6 from "@/sensor-data/a_1767732083792.json";
// import dataA7 from "@/sensor-data/a_1767732081976.json";
// import dataA8 from "@/sensor-data/a_1767732080087.json";
// import dataA9 from "@/sensor-data/a_1767732077646.json";

// import dataB0 from "@/sensor-data/b_1767732139295.json";
// import dataB1 from "@/sensor-data/b_1767732140710.json";
// import dataB2 from "@/sensor-data/b_1767732142088.json";
// import dataB3 from "@/sensor-data/b_1767732143575.json";
// import dataB4 from "@/sensor-data/b_1767732144806.json";
// import dataB5 from "@/sensor-data/b_1767732146328.json";
// import dataB6 from "@/sensor-data/b_1767732147776.json";
// import dataB7 from "@/sensor-data/b_1767732149206.json";
// import dataB8 from "@/sensor-data/b_1767732150540.json";
// import dataB9 from "@/sensor-data/b_1767732151870.json";

const dataSets = [
  dataA0,
  dataA1,
  dataA2,
  dataA3,
  dataA4,
  dataB0,
  dataB1,
  dataB2,
  dataB3,
  dataB4,
];

export default function VisualizePage() {
  // Use Plotly to plot the sensor data as a 3d line
  const plotData: ComponentProps<typeof Plot>["data"] = useMemo(() => {
    return dataSets.map((data) => {
      const normalize = data.data.reduce(
        (acc, { x, y, z }) => [
          ...acc,
          {
            // x: x,
            // y: y,
            // z: z,
            x: acc[acc.length - 1].x + x,
            y: acc[acc.length - 1].y + y,
            z: acc[acc.length - 1].z + z,
          },
        ],
        // []
        [{ x: 0, y: 0, z: 0 }]
      );

      return {
        x: normalize.map((r) => r.x),
        y: normalize.map((r) => r.y),
        z: normalize.map((r) => r.z),
        mode: "lines+markers",
        type: "scatter3d",
        line: {
          width: 2,
          color: data.label === "a" ? "blue" : "green",
        },
        marker: {
          size: normalize.map((_, i) => (i === 0 ? 10 : 1)),
          color: data.label === "a" ? "blue" : "green",
        },
        name: `Sensor Data - ${data.label}`,
      };
    });
  }, []);

  const layout: ComponentProps<typeof Plot>["layout"] = useMemo(
    () => ({
      title: { text: `3D Sensor Data Visualization` },
      scene: {
        xaxis: { title: { text: "X Axis" } },
        yaxis: { title: { text: "Y Axis" } },
        zaxis: { title: { text: "Z Axis" } },
      },
      autosize: true,
    }),
    []
  );

  return (
    <div className="w-screen h-screen">
      <Plot
        data={plotData}
        layout={layout}
        style={{ width: "100%", height: "100%" }}
        useResizeHandler
      />
    </div>
  );
}
