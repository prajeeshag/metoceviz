import { PixelField, type PixelFieldProps } from "./pixel-data";
import { logger } from "../../logger";
import { geoPath } from "d3";

export async function getPixelField(
  props: PixelFieldProps,
  signal: AbortSignal,
): Promise<PixelField> {
  const { width, height, globe, grid } = props;
  const mask = createMask(props);
  const gridValue = grid.value;
  const pixelFieldArray = new Float32Array(width * height);
  let lastYieldTime = performance.now();
  const projection = globe.projection;
  for (let y = 0; y < height; y += 1) {
    if (signal.aborted) throw new Error("Aborted");

    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      const point = projection.invert!([x, y]);
      const value = gridValue.interpolate(point![0], point![1]);
      pixelFieldArray[y * width + x] = value;
    }

    // Yield logic to keep UI responsive
    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }

  return new PixelField(props, pixelFieldArray);
}

function createMask(props: PixelFieldProps) {
  const canvas = document.createElement("canvas");
  canvas.width = props.width;
  canvas.height = props.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is null!");
  }
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  geoPath(props.globe.projection, ctx)({ type: "Sphere" });
  ctx.fill();
  // 2. Extract pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data; // This is a RGBA Uint8ClampedArray

  // 3. Convert to a simpler 1-byte mask (0 or 1)
  const mask = new Uint8Array(props.width * props.height);

  for (let i = 0; i < mask.length; i++) {
    // Check the Alpha channel (index i * 4 + 3)
    // If it's > 0, the pixel is inside the globe
    mask[i] = pixels[i * 4 + 3]! > 0 ? 1 : 0;
  }

  return mask;
}
