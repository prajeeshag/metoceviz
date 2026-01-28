import d3, { geoEqualEarth } from "d3";
import type { StrictData } from "../../datatype/types";


const PROJECTION_MAP: Record<string, () => d3.GeoProjection | d3.GeoConicProjection> = {
    Stereographic: d3.geoStereographic,
    Mercator: d3.geoMercator,
    ConicConformal: d3.geoConicConformal,
    Equirectangular: d3.geoEquirectangular,
    Orthographic: d3.geoOrthographic,
    EqualEarth: d3.geoEqualEarth,
} as const


export type ProjConfig = {
    readonly name: keyof typeof PROJECTION_MAP,
    readonly rotation: [number, number, number]
    readonly translation: [number, number]
    readonly scale: number
    readonly parallels: [number, number]
}


class Proj {
    constructor(private _projection: d3.GeoProjection | d3.GeoConicProjection) { }

    project([lat, lon]: [number, number]): [number, number] | null {
        return this._projection([lon, lat]);
    }
    invert([x, y]: [number, number]): [number, number] | null {
        return this._projection.invert?.([x, y]) ?? null;
    }
    geoPath(ctx: CanvasRenderingContext2D) {
        return d3.geoPath(this._projection, ctx);
    }
}

export function getProjection(config: ProjConfig): Proj {
    const projection = d3.geoOrthographic()
        .rotate(config.rotation)
        .translate(config.translation)
        .scale(config.scale)
    return new Proj(projection);
}