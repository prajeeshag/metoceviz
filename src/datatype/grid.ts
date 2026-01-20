import { logger } from "../logger";

export interface GridHeader {
  x0: number;
  dx: number;
  nx: number;
  y0: number;
  dy: number;
  ny: number;
}

abstract class GridBase<T> {
  protected log = logger.child({ component: this.constructor.name });

  constructor(public readonly header: GridHeader) {}

  public abstract isel(row: number, col: number): T;
  public abstract interpolate(lat: number, lon: number): T;

  /**
   * Centralized Bilinear Interpolation Math
   * Formula: f(x,y) ≈ f(0,0)(1-x)(1-y) + f(1,0)x(1-y) + f(0,1)(1-x)y + f(1,1)xy
   */
  protected bilinear(
    v00: number,
    v10: number,
    v01: number,
    v11: number,
    u: number,
    v: number,
  ): number {
    const top = v00 + u * (v10 - v00);
    const bottom = v01 + u * (v11 - v01);
    return top + v * (bottom - top);
  }

  protected getInterpolationContext(x: number, y: number) {
    const { x0, dx, nx, y0, dy, ny } = this.header;
    const fCol = (x - x0) / dx;
    const fRow = (y - y0) / dy;

    const c0 = Math.floor(fCol);
    const r0 = Math.floor(fRow);
    const c1 = c0 + 1;
    const r1 = r0 + 1;

    if (c0 < 0 || r0 < 0 || c1 >= nx || r1 >= ny) return null;

    return { u: fCol - c0, v: fRow - r0, r0, r1, c0, c1 };
  }

  public contains(x: number, y: number): boolean {
    const { x0, dx, nx, y0, dy, ny } = this.header;
    const xMax = x0 + dx * (nx - 1);
    const yMax = y0 + dy * (ny - 1);
    const isXInRange = dx > 0 ? x >= x0 && x <= xMax : x <= x0 && x >= xMax;
    const isYInRange = dy > 0 ? y >= y0 && y <= yMax : y <= y0 && y >= yMax;
    return isXInRange && isYInRange;
  }
}

export class GridScalar extends GridBase<number> {
  constructor(
    header: GridHeader,
    public readonly values: Float32Array,
  ) {
    super(header);
  }

  public isel(j: number, i: number): number {
    return this.values[j * this.header.nx + i]!;
  }

  interpolatexy(x: number, y: number): number {
    const ctx = this.getInterpolationContext(x, y);
    if (!ctx) return NaN;

    const v00 = this.isel(ctx.r0, ctx.c0);
    const v10 = this.isel(ctx.r0, ctx.c1);
    const v01 = this.isel(ctx.r1, ctx.c0);
    const v11 = this.isel(ctx.r1, ctx.c1);

    return this.bilinear(v00!, v10!, v01!, v11!, ctx.u, ctx.v);
  }

  public interpolate(x: number, y: number): number {
    return this.interpolatexy(x, y);
  }
}

export class GeoGridScalar extends GridScalar {
  public override interpolate(lon: number, lat: number): number {
    var x = lon;
    var y = lat;
    if (lon < 0 && this.header.x0 + this.header.dx * this.header.nx > 180) {
      x = lon + 360;
    } else if (lon > 180 && this.header.x0 < 0) {
      x = lon - 360;
    }
    return this.interpolatexy(x, y);
  }
}
