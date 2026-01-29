import {
  PixelProjected,
  type PixelProjectedConfig,
} from "./pixel-data-projected";
import { getProjection, Proj } from "../globe/proj";

export async function getPixelProj(
  props: PixelProjectedConfig,
  signal: AbortSignal,
): Promise<PixelProjected> {
  const width = props.viewSize[0];
  const height = props.viewSize[1];
  const proj = getProjection(props.proj);
  const mask = createMask(props, proj);

  const gridValue = props.grid;
  const pixelFieldArray = new Float32Array(width * height);

  let lastYieldTime = performance.now();
  for (let y = 0; y < height; y += 1) {
    if (signal.aborted) throw new Error("Aborted");
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] === 0) continue;
      const point = proj.invert!([x, y]);
      const value = gridValue.interpolateBilinear(
        point![0],
        point![1],
        is_preriodic(props.lonStart, props.nlon, props.dlon),
      );
      pixelFieldArray[y * width + x] = value;
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }
  return new PixelProjected(props, pixelFieldArray);
}

function createMask(props: PixelProjectedConfig, proj: Proj) {
  const canvas = document.createElement("canvas");
  canvas.width = props.viewSize[0];
  canvas.height = props.viewSize[1];
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is null!");
  }
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  proj.geoPath(ctx)({ type: "Sphere" });
  ctx.fill();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  const mask = new Uint8Array(canvas.width * canvas.height);

  for (let i = 0; i < mask.length; i++) {
    mask[i] = pixels[i * 4 + 3]! > 0 ? 1 : 0;
  }

  return mask;
}

function is_preriodic(lonStart: number, nlon: number, dlon: number) {
  const lonEnd = lonStart + nlon * dlon;
  return lonStart === lonEnd - 360;
}
