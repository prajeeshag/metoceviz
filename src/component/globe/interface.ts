
import * as d3geo from "d3-geo";
import { type DragBehavior } from "d3-drag";

export interface IGlobe {
  getRotation(): [number, number, number];
  setRotation(r: [number, number, number]): void;
  getTranslate(): [number, number];
  setTranslate(t: [number, number]): void;
  getScale(): number;
  invert(point: [number, number]): [number, number] | null | undefined;
}

export interface DragHandler {
  (
    globe: IGlobe,
    renderDrag: (globe: any) => void,
    renderEnd: (globe: any) => void,
  ): DragBehavior<HTMLCanvasElement, unknown, unknown>;
}

export interface BaseScaleHandler {
  (projection: d3geo.GeoProjection, viewportSize: [number, number]): void;
}

export interface Projection {
  d3proj: () => d3geo.GeoProjection;
  dragHandler: DragHandler;
  baseScaleHandler: BaseScaleHandler;
  scaleExtent: readonly [number, number];
}