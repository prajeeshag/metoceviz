import { PixelNative, type PixelNativeConfig } from "./pixel-data-native";

export async function interpPixelNative(
  props: PixelNativeConfig,
  signal: AbortSignal,
): Promise<PixelNative> {
  const viewWidth = props.viewSize[0]; // Canvas width
  const viewHeight = props.viewSize[1]; // Canvas height
  const utils = new PixelNativeUtil(props);
  const gridValue = props.grid;
  const pixelFieldArray = new Float32Array(viewHeight * viewWidth);
  let lastYieldTime = performance.now();
  const { x0, x1, y0, y1 } = utils.canvasGridBounds();

  for (let py = y0; py <= y1; py++) {
    if (signal.aborted) throw new Error("Aborted");
    for (let px = x0; px <= x1; px += 1) {
      const point = utils.canvasToGrid(px, py);
      const value = gridValue.interpolateBilinear(point[0], point[1], false);
      pixelFieldArray[py * viewWidth + px] = value;
    }

    if (performance.now() - lastYieldTime > 16) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      lastYieldTime = performance.now();
    }
  }

  return new PixelNative(props, pixelFieldArray);
}
