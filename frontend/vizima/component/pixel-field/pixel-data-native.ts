import { Agent, Provider } from "../../datatype/types";
import { GridData } from "../grid-data";
import { Data } from "../../datatype/types";
import { PixelData, type PixelConfig } from "./pixel-data";

export type PixelNativeConfig = {
  readonly gridStartPoint: [number, number];
  readonly gridEndPoint: [number, number];
  readonly gridSize: [number, number];
} & PixelConfig;

/*
 * PixelNative class represents a pixel data where
 * the pixel projection and grid projection are same.
 */
export class PixelNative extends PixelData<PixelNativeConfig> {}

const CACHE_SIZE = 1;
export class PixelDataNativeAgent extends Agent<
  PixelNativeConfig,
  PixelNative
> {}
export class PixelDataNativeProvider extends Provider<
  PixelNativeConfig,
  PixelNative
> {}
