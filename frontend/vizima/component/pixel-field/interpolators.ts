import { PixelField, type PixelFieldConfig } from "./pixel-data";
import { getProjection } from "../globe/proj";

export async function getPixelField(
  props: PixelFieldConfig,
  signal: AbortSignal,
): Promise<PixelField> {

  const width = props.width;
  const height = props.height;
  const proj = getProjection(props.proj);
  const mask = createMask(props);

  const gridValue = grid.value;
  const pixelFieldArray = new Float32Array(width * height);
  let lastYieldTime = performance.now();
  const projection = globe;
  for (let y = 0; y < height; y += 1) {
    if (signal.aborted) throw new Error("Aborted");

    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      const point = projection.invert!([x, y]);
      const value = gridValue.interpolate(point![0], point![1]);
      pixelFieldArray[y * width + x] = value;
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }

  return new PixelField(props, pixelFieldArray);
}

function createMask(props: PixelFieldConfig) {
  const canvas = document.createElement("canvas");
  canvas.width = props.width;
  canvas.height = props.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is null!");
  }
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  props.globe.geoPath(ctx)({ type: "Sphere" });
  ctx.fill();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const mask = new Uint8Array(props.width * props.height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = pixels[i * 4 + 3]! > 0 ? 1 : 0;
  }

  return mask;
}







