import * as d3 from "d3";
import { zoom as d3zoom, type ZoomBehavior, type DragBehavior } from "d3";
import { type ProjectionType, PROJECTIONS } from "./projections";
import { type ConfigType } from "../../datatype/types";

export type GlobeConfig = {
  proj: ProjectionType;
  rot?: [number, number, number];
  trans?: [number, number];
  scale?: number;
  parallels?: [number, number];
};

export class Globe extends ImmutableComponent<GlobeConfig, null> {
  private _projection: d3.GeoProjection;
  private scaleExtent: [number, number];

  constructor(props: {
    proj: ProjectionType;
    viewSize: [number, number];
    rot?: [number, number, number];
    trans?: [number, number];
    scale?: number;
    scaleExtent?: [number, number];
    parallels?: [number, number]; // For conic projections
  }) {
    const projConfig = PROJECTIONS[props.proj];
    const d3proj = projConfig.d3proj();
    projConfig.baseScaleHandler(d3proj, [...props.viewSize]);
    d3proj
      .translate([props.viewSize[0] / 2, props.viewSize[1] / 2])
      .clipExtent([[0, 0], [...props.viewSize]]);

    if (props.rot) {
      d3proj.rotate([...props.rot]);
    }
    if (props.trans) {
      d3proj.translate([...props.trans]);
    }
    if (props.scale) {
      d3proj.scale(props.scale);
    }
    if (props.parallels && "parallels" in d3proj) {
      (d3proj as any).parallels(props.parallels);
    }

    super({ proj: props.proj, viewSize: props.viewSize }, null);
    this._projection = d3proj;
    this.scaleExtent = props.scaleExtent || [...projConfig.scaleExtent];
  }

  projectviz(coordinates: [number, number]): [number, number] | null {
    const visible = d3.geoPath(this._projection)({
      type: "Point",
      coordinates: coordinates,
    });
    if (!visible) {
      return null;
    }
    const result = this._projection(coordinates);
    return result ? [result[0], result[1]] : null;
  }

  invertviz(point: [number, number]): [number, number] | null {
    const coords = this._projection.invert?.(point);
    if (!coords) return null;

    const reprojected = this._projection(coords);
    if (
      !reprojected ||
      Math.abs(point[0] - reprojected[0]) > 0.5 ||
      Math.abs(point[1] - reprojected[1]) > 0.5
    ) {
      return null;
    }

    return coords;
  }

  project(coordinates: [number, number]): [number, number] | null {
    return this._projection(coordinates);
  }

  invert(point: [number, number]): [number, number] | null | undefined {
    return this._projection.invert?.(point);
  }

  getTranslate(): [number, number] {
    return this._projection.translate();
  }

  setTranslate(trans: [number, number]) {
    this._projection.translate(trans);
  }

  getRotation(): [number, number, number] {
    return this._projection.rotate();
  }

  setRotation(rotation: [number, number, number]) {
    this._projection.rotate(rotation);
  }

  getScale(): number {
    return this._projection.scale();
  }

  setScale(scale: number) {
    this._projection.scale(scale);
  }

  getParallels(): [number, number] | undefined {
    return (this._projection as any).parallels?.();
  }

  setParallels(parallels: [number, number]) {
    (this._projection as any).parallels(parallels);
  }

  geoPath(ctx: CanvasRenderingContext2D) {
    return d3.geoPath(this._projection, ctx);
  }

  dragHandler(
    renderDrag: (globe: Globe) => void,
    renderEnd: (globe: Globe) => void,
  ): DragBehavior<HTMLCanvasElement, unknown, unknown> {
    return PROJECTIONS[this.props.proj].dragHandler(
      this,
      renderDrag,
      renderEnd,
    );
  }
  zoomHandler(
    renderZoom: (globe: Globe) => void,
    renderEnd: (globe: Globe) => void,
  ): ZoomBehavior<HTMLCanvasElement, unknown> {
    const s0 = this.getScale();
    return d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .on("zoom", (event) => {
        const { transform } = event;
        const newScale = s0 * transform.k;
        this.setScale(newScale);
        renderZoom(this);
      })
      .on("end", () => {
        renderEnd(this);
      });
  }

  override getFingerprint(): string {
    const proj = this.props.proj;
    const viewSize = this.props.viewSize;
    const rot = this._projection.rotate();
    const trans = this._projection.translate();
    const scale = this._projection.scale();
    if ("parallels" in this._projection) {
      return JSON.stringify({
        proj: proj,
        viewSize: viewSize,
        rot: rot,
        trans: trans,
        scale: scale,
        parallels: (this._projection as any).parallels(),
      });
    }
    return JSON.stringify({
      proj: proj,
      viewSize: viewSize,
      rot: rot,
      trans: trans,
      scale: scale,
    });
  }
}
