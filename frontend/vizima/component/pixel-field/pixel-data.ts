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
> {
  isDefined(x: number, y: number): boolean {
    return !Number.isNaN(this.value[x + y * this.props.width]);
  }
  get(x: number, y: number): number {
    const val = this.value[x + y * this.props.width];
    return !val ? NaN : val;
  }
}

interface Vector{
  u: Float32Array;
  v: Float32Array;
}

export class PixelFieldVector extends ImmutableComponent<
  PixelFieldProps,
  Vector
> {
  get(x: number, y: number): { u: number; v: number } {
    const u = this.value.u[x + y * this.props.width]
    const v = this.value.v[x + y * this.props.width]
    return !u || !v ? { u: NaN, v: NaN } : { u, v };
  }
  isValid(x: number, y: number): boolean {
    const { u, v } = this.get(x, y);
    return !u || !v || !isNaN(u) || !isNaN(v)
  }
}