import { ImmutableComponent } from "../types";
import { GridScalarData } from "../grid-data";
import type { Globe } from "../globe";

export interface PixelFieldProps {
  readonly grid: GridScalarData;
  readonly globe: Globe;
  readonly width: number;
  readonly height: number;
}

export class PixelField extends ImmutableComponent<
  PixelFieldProps,
  Float32Array
> {}
