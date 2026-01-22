
import * as d3 from "d3";
import { type Projection } from "./interface";
import { dragRotation, dragTranslateWrapX } from "./dragHandler";
import { baseScaleFit, baseScaleFill } from "./baseScaleHandler";

const DEFAULT_SCALE_EXTENT: [number, number] = [0.5, 8];


export const PROJECTIONS_CONFIG = {
  orthographic: {
    d3proj: d3.geoOrthographic,
    dragHandler: dragRotation,
    baseScaleHandler: baseScaleFit,
    scaleExtent: DEFAULT_SCALE_EXTENT,
  },
  mercator: {
    d3proj: d3.geoMercator,
    dragHandler: dragTranslateWrapX,
    baseScaleHandler: baseScaleFill,
    scaleExtent: DEFAULT_SCALE_EXTENT,
  },
  latlon: {
    d3proj: d3.geoEquirectangular,
    dragHandler: dragTranslateWrapX,
    baseScaleHandler: baseScaleFill,
    scaleExtent: DEFAULT_SCALE_EXTENT,
  },
  equalEarth: {
    d3proj: d3.geoEqualEarth,
    dragHandler: dragTranslateWrapX,
    baseScaleHandler: baseScaleFill,
    scaleExtent: DEFAULT_SCALE_EXTENT,
  },
  lambert: {
    d3proj: d3.geoConicConformal,
    dragHandler: dragTranslateWrapX,
    baseScaleHandler: (globe: any, size: [number, number]) => {},
    scaleExtent: [1, 100],
  },

} as const;

export type ProjectionType = keyof typeof PROJECTIONS_CONFIG;

export const PROJECTIONS: Record<ProjectionType, Projection> = PROJECTIONS_CONFIG;

