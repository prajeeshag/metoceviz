import { type PColorLayerProps, PColorLayer } from "./pcolor-layer";
import { Agent, Provider } from "../types";
import * as d3 from "d3";
import { createCanvasFn } from "../canvas";
import { logger } from "../../logger";

class PcolorLayerAgent extends Agent<PColorLayerProps, PColorLayer> {}
class PcolorLayerProvider extends Provider<PColorLayerProps, PColorLayer> {}

async function drawPColorLayer(
  props: PColorLayerProps,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  const log = logger.child({ component: "drawPColorLayer" });
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  const imgData = ctx.createImageData(canvas.width, canvas.height);

  const rgba = imgData.data;

  const pixelField = props.field.value;
  const min = d3.min(pixelField) as number;
  const max = d3.max(pixelField) as number;

  // This replaces manual normalization
  const colorScale = d3
    .scaleSequential(d3.interpolateViridis)
    .domain([min, max]) // Set the data bounds here
    .clamp(true); // Optional: keeps values outside domain from breaking

  for (let i = 0; i < pixelField.length; i++) {
    const val = pixelField[i];
    const pos = i * 4;

    // 1. Check for NaN
    if (!val || isNaN(val)) {
      rgba[pos + 3] = 0;
      continue;
    }

    // 2. Normal coloring logic for valid numbers
    const { r, g, b } = d3.rgb(colorScale(val));
    rgba[pos] = r;
    rgba[pos + 1] = g;
    rgba[pos + 2] = b;
    rgba[pos + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

const createPColorLayerCanvas = createCanvasFn<PColorLayerProps, PColorLayer>(
  PColorLayer,
  drawPColorLayer,
);

export const pcolorLayerAgent = new PcolorLayerAgent(
  new PcolorLayerProvider(createPColorLayerCanvas),
);
