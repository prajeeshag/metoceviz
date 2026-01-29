import type { ProjConfig } from "../globe/proj";
import { Agent, Provider } from "../../datatype/types";
import { GridData } from "../grid-data";
import { Data } from "../../datatype/types";
import { PixelData, type PixelConfig } from "./pixel-data";

export type PixelProjectedConfig = {
  readonly proj: ProjConfig;
  readonly lonStart: number;
  readonly latStart: number;
  readonly nlon: number;
  readonly nlat: number;
  readonly dlon: number;
  readonly dlat: number;
} & PixelConfig;

export class PixelProjected extends PixelData<PixelProjectedConfig> {}

const CACHE_SIZE = 1;
export class PixelProjectedAgent extends Agent<
  PixelProjectedConfig,
  PixelProjected
> {}
export class PixelProjectedProvider extends Provider<
  PixelProjectedConfig,
  PixelProjected
> {}
