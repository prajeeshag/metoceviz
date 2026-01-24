import { GridData, type GridProps } from "./grid-data";

export interface GridVectorProps extends GridProps {
  readonly uUrl: string;
  readonly vUrl: string;
}

export class GridVector extends GridData<[Float32Array, Float32Array], [number, number], GridVectorProps> {

  get(i: number, j: number): [number, number] {
    if (i < 0 || j < 0 || i >= this.props.nx || j >= this.props.ny) return [NaN, NaN];
    const idx = i + j * this.props.nx
    const val0 = this.value[0][idx];
    const val1 = this.value[1][idx];
    return [val0 === undefined ? NaN : val0, val1 === undefined ? NaN : val1]
  }

  interpolateBilinear(x: number, y: number): [number, number] {
    const ctx = this.bilinearInterpCtx(x, y);
    if (ctx.i0 < 0 || ctx.j0 < 0 || ctx.i1 >= this.props.nx || ctx.j1 >= this.props.ny) return [NaN, NaN];

    const v00 = this.get(ctx.i0, ctx.j0);
    const v10 = this.get(ctx.i1, ctx.j0);
    const v01 = this.get(ctx.i0, ctx.j1);
    const v11 = this.get(ctx.i1, ctx.j1);
    const val0 = this.bilinear(v00[0], v10[0], v01[0], v11[0], ctx.u, ctx.v);
    const val1 = this.bilinear(v00[1], v10[1], v01[1], v11[1], ctx.u, ctx.v);
    return [val0, val1];
  }

  interpolateNearest(x: number, y: number): [number, number] {
    const ctx = this.nearestInterpCtx(x, y);
    if (ctx.i0 < 0 || ctx.j0 < 0 || ctx.i0 >= this.props.nx || ctx.j0 >= this.props.ny) return [NaN, NaN];

    return this.get(ctx.i0, ctx.j0);
  }

}
