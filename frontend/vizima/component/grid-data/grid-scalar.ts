import { GridData, type GridProps } from "./grid-data";

export interface GridScalarProps extends GridProps {
  readonly url: string;
}

export class GridScalar extends GridData<Float32Array, number, GridScalarProps> {

  get(i: number, j: number): number {
    if (i < 0 || j < 0 || i >= this.props.nx || j >= this.props.ny) return NaN;
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
