import type { LatAxis, LonAxis } from "../../datatype/dataset";
import type { ProjConfig } from "../globe/proj";
import { Agent, Provider } from "../../datatype/types";
import { getPixelField } from "./interpolators";

export type Grid = {
  readonly url: string,
  readonly lonAxis: LonAxis,
  readonly latAxis: LatAxis,
  readonly timeIndex?: number,
  readonly verticalIndex?: number,
}

export type PixelFieldConfig = {
  readonly grid: Grid;
  readonly proj: ProjConfig;
  readonly width: number;
  readonly height: number;
}

export class PixelField {
  constructor(
    private readonly width: number,
    private readonly height: number,
    private readonly value: Float32Array
  ) { }

  isDefined(x: number, y: number): boolean {
    return !Number.isNaN(this.get(x, y));
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return NaN;
    }
    const val = this.value[x + y * this.width];
    return !val ? NaN : val;
  }

}


const CACHE_SIZE = 50;
export class PixelFieldAgent extends Agent<PixelFieldConfig, PixelField> { }
export class PixelFieldProvider extends Provider<PixelFieldConfig, PixelField> { }

export const pixelFieldAgent = new PixelFieldAgent(
  new PixelFieldProvider(getPixelField, CACHE_SIZE),
);

export const createPixelFieldAgent = () =>
  new PixelFieldAgent(new PixelFieldProvider(getPixelField, CACHE_SIZE));