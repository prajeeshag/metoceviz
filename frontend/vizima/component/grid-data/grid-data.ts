import { ImmutableComponent, type ValidComponentProps } from "../types";

export interface GridProps {
  readonly xs: number; // x coordinate start
  readonly ys: number; // y coordinate start
  readonly dx: number; // x coordinate step
  readonly dy: number; // y coordinate step
  readonly nx: number; // number of x coordinates
  readonly ny: number; // number of y coordinates
  readonly tIndex?: number;
  readonly lIndex?: number;
  readonly islatlon?: boolean;
}


export interface GridScalarProps extends GridProps {
  readonly url: string;
}

export interface GridVectorProps extends GridProps {
  readonly uUrl: string;
  readonly vUrl: string;
}

interface VectorValue {
  readonly u: number;
  readonly v: number;
}

interface VectorField {
  readonly u: Float32Array;
  readonly v: Float32Array;
}

export type ValidGridProps<T> = ValidComponentProps<T> & GridProps;

export abstract class GridData<Field, Value, Props extends ValidGridProps<Props>> extends ImmutableComponent<
  Props,
  Field
> {

  abstract get(i: number, j: number): Value;
  abstract interpolateBilinear(x: number, y: number): Value
  abstract interpolateNearest(x: number, y: number): Value;

  protected bilinear(
    v00: number,
    v10: number,
    v01: number,
    v11: number,
    u: number,
    v: number,
  ): number {
    if (isNaN(v00) || isNaN(v10) || isNaN(v01) || isNaN(v11)) return NaN;
    const top = v00 + u * (v10 - v00);
    const bottom = v01 + u * (v11 - v01);
    return top + v * (bottom - top);
  }

  protected get xe(): number {
    const props = this.props as GridProps;
    return props.xs + props.dx * props.nx;
  }

  protected get ye(): number {
    const props = this.props as GridProps;
    return props.ys + props.dy * props.ny;
  }

  protected get xwrap(): boolean {
    if (!this.props.islatlon) {
      return false;
    }
    const props = this.props as GridProps;
    const lon_wrap = props.xs + props.dx * props.nx;
    return Math.abs(lon_wrap - props.xs - 360) < 1e-7;
  }

  protected bilinearInterpCtx(x: number, y: number) {
    x = this.sanitizeLon(x);
    const props = this.props as GridProps;
    const { xs, dx, nx, ys, dy, ny } = props;
    const fCol = (x - xs) / dx;
    const fRow = (y - ys) / dy;

    let i0 = Math.floor(fCol);
    let j0 = Math.floor(fRow);
    let i1 = i0 + 1;
    let j1 = j0 + 1;

    const v = fRow - j0;

    const u = fCol - i0;

    console.log("before", i0, i1, x, fCol)
    if (this.xwrap) {
      if (i0 < 0) {
        i0 = nx + i0;
      }
      if (i0 >= nx) {
        i0 = i0 - nx;
      }
      if (i1 >= nx) {
        i1 = i1 - nx;
      }
    }
    console.log("after", i0, i1, x, fCol)
    return { i0, j0, i1, j1, u, v };
  }


  protected nearestInterpCtx(x: number, y: number) {
    x = this.sanitizeLon(x);
    const props = this.props as GridProps;
    const { xs, dx, nx, ys, dy, ny } = props;
    const fCol = (x - xs) / dx;
    const fRow = (y - ys) / dy;

    let i0 = Math.round(fCol);
    let j0 = Math.round(fRow);

    if (this.xwrap) {
      if (i0 < 0) {
        i0 = nx - 1;
      }
      if (i0 >= nx) {
        i0 = 0;
      }
    }

    return { i0, j0 };
  }


  protected sanitizeLon(lon: number): number {
    const props = this.props as GridProps;
    if (!props.islatlon) {
      return lon;
    }
    if (lon < 0 && this.xe > 180) {
      return lon + 360;
    } else if (lon > 180 && props.xs < 0) {
      return lon - 360;
    }
    return lon;
  }

}


export class GridScalarData extends GridData<Float32Array, number, GridScalarProps> {

  get(i: number, j: number): number {
    const val = this.value[i + j * this.props.nx];
    return val === undefined ? NaN : val;
  }

  interpolateBilinear(x: number, y: number): number {
    const ctx = this.bilinearInterpCtx(x, y);
    if (ctx.i0 < 0 || ctx.j0 < 0 || ctx.i1 >= this.props.nx || ctx.j1 >= this.props.ny) return NaN;

    const v00 = this.get(ctx.i0, ctx.j0);
    const v10 = this.get(ctx.i1, ctx.j0);
    const v01 = this.get(ctx.i0, ctx.j1);
    const v11 = this.get(ctx.i1, ctx.j1);
    return this.bilinear(v00, v10, v01, v11, ctx.u, ctx.v);
  }

  interpolateNearest(x: number, y: number): number {
    const ctx = this.nearestInterpCtx(x, y);
    if (ctx.i0 < 0 || ctx.j0 < 0 || ctx.i0 >= this.props.nx || ctx.j0 >= this.props.ny) return NaN;

    return this.get(ctx.i0, ctx.j0);
  }

}
