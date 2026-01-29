import { Data } from "../../datatype/types";

export type GridConfig = {
  url: string;
  readonly xs: number;
  readonly ys: number;
  readonly nx: number;
  readonly ny: number;
  readonly timeIndex?: number;
  readonly vertIndex?: number;
};

export class GridData extends Data<GridConfig, Float32Array> {
  get(x: number, y: number): number {
    const i = Math.floor(x) - this.props.xs;
    const j = Math.floor(y) - this.props.ys;
    if (i < 0 || i >= this.props.nx || j < 0 || j >= this.props.ny) {
      return NaN;
    }
    const val = this.value[j * this.props.nx + i];
    return val === undefined ? NaN : val;
  }
  private bilinear(
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

  private bilinearInterpCtx(x: number, y: number, xwrap: boolean) {
    const fCol = x - this.props.xs;
    const fRow = y - this.props.ys;

    let i0 = Math.floor(fCol);
    let j0 = Math.floor(fRow);
    let i1 = i0 + 1;
    let j1 = j0 + 1;

    const v = fRow - j0;
    const u = fCol - i0;

    if (xwrap) {
      if (i0 < 0) {
        i0 = this.props.nx + i0;
      }
      if (i0 >= this.props.nx) {
        i0 = i0 - this.props.nx;
      }
      if (i1 >= this.props.nx) {
        i1 = i1 - this.props.nx;
      }
    }
    return { i0, j0, i1, j1, u, v };
  }

  protected nearestInterpCtx(x: number, y: number, xwrap: boolean) {
    const fCol = x - this.props.xs;
    const fRow = y - this.props.ys;
    let i0 = Math.round(fCol);
    let j0 = Math.round(fRow);

    if (xwrap) {
      if (i0 < 0) {
        i0 = this.props.nx - 1;
      }
      if (i0 >= this.props.nx) {
        i0 = i0 - this.props.nx;
      }
    }
    return { i0, j0 };
  }

  interpolateBilinear(x: number, y: number, xwrap: boolean): number {
    const ctx = this.bilinearInterpCtx(x, y, xwrap);
    if (
      ctx.i0 < 0 ||
      ctx.j0 < 0 ||
      ctx.i1 >= this.props.nx ||
      ctx.j1 >= this.props.ny
    )
      return NaN;

    const v00 = this.get(ctx.i0, ctx.j0);
    const v10 = this.get(ctx.i1, ctx.j0);
    const v01 = this.get(ctx.i0, ctx.j1);
    const v11 = this.get(ctx.i1, ctx.j1);
    return this.bilinear(v00, v10, v01, v11, ctx.u, ctx.v);
  }

  interpolateNearest(x: number, y: number, xwrap: boolean): number {
    const ctx = this.nearestInterpCtx(x, y, xwrap);
    if (
      ctx.i0 < 0 ||
      ctx.j0 < 0 ||
      ctx.i0 >= this.props.nx ||
      ctx.j0 >= this.props.ny
    )
      return NaN;
    return this.get(ctx.i0, ctx.j0);
  }
}
