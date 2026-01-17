import * as d3geo from "d3-geo";
import { select as d3select } from "d3-selection";
import { drag as d3drag } from "d3-drag";
import { zoom as d3zoom } from "d3-zoom";
import versor from "versor";

/*
    Projection variations are created by:
    1. Selecting a Projection like geoMercator, geoOrthographic
    2. center is fixed
    3. baseScale is set internally by d3.projection.fitSize to show the full globe
    4. zoom interaction: 
       minScaleExtend is scaleFit,
       maxScaleExtend is setable, with a default of 8
    6. drag interaction:
        Rotation or Translation depending on the projection type
}
*/

interface DragHandler {
  (
    projection: d3geo.GeoProjection,
    canvas: HTMLCanvasElement,
    render: () => void,
  ): void;
}

interface BaseScaleHandler {
  (projection: d3geo.GeoProjection, viewportSize: [number, number]): void;
}

interface Projection {
  d3proj: () => d3geo.GeoProjection;
  dragHandler: DragHandler;
  center: [number, number];
  baseScaleHandler: BaseScaleHandler;
}

function dragRotation(
  projection: d3geo.GeoProjection,
  canvas: HTMLCanvasElement,
  render: () => void,
): void {
  canvas.style.touchAction = "none";
  const selection = d3select(canvas);
  let v0: [number, number];
  let r0: [number, number, number];
  let q0: number;

  // Rotation (Drag)
  selection.call(
    d3drag<HTMLCanvasElement, unknown>()
      // FILTER: Only allow drag if it's NOT a two-finger touch (pinch)
      .filter((event) => {
        return !event.touches || event.touches.length < 2;
      })
      .on("start", (event) => {
        const r = projection.rotate();
        // Convert current rotation to a versor (quaternion)
        const coord = projection.invert?.([event.x, event.y]);
        if (!coord) return;
        v0 = versor.cartesian(coord);
        r0 = r;
        q0 = versor(r);
      })
      .on("drag", (event) => {
        // CRITICAL: If a second finger touches mid-drag, stop rotating immediately
        if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
          return;
        }
        // 2. Calculate the current mouse position in 3D cartesian space
        const coord = projection.rotate(r0).invert?.([event.x, event.y]);
        if (!coord) return;
        const v1 = versor.cartesian(coord);

        // 3. Calculate the rotation difference (the "delta" in 3D)
        const q1 = versor.multiply(q0, versor.delta(v0, v1));

        // 4. Update the projection with the new rotation
        projection.rotate(versor.rotation(q1));
        canvas.style.cursor = "grabbing";
        render();
      })
      .on("end", () => {
        canvas.style.cursor = "default";
      }),
  );
}

function dragTranslation(
  projection: d3geo.GeoProjection,
  canvas: HTMLCanvasElement,
  render: () => void,
): void {
  canvas.style.touchAction = "none";
  const selection = d3select(canvas);

  let t0: [number, number]; // Initial translation state [x, y]
  let p0: [number, number]; // Initial pointer position [x, y]
  selection.call(
    d3drag<HTMLCanvasElement, unknown>()
      .filter((event) => {
        // Filter out multi-touch (pinch) to prevent conflict
        return !event.touches || event.touches.length < 2;
      })
      .on("start", (event) => {
        // Capture the current translation of the projection
        t0 = projection.translate();

        // Capture the starting mouse/touch position
        p0 = [event.x, event.y];
      })
      .on("drag", (event) => {
        // Stop if a second finger is detected mid-drag
        if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
          return;
        }

        // Calculate the delta movement
        const dx = event.x - p0[0];
        const dy = event.y - p0[1];

        // Apply the delta to the initial translation
        // New Translate = [initialX + dx, initialY + dy]
        projection.translate([t0[0] + dx, t0[1] + dy]);
        canvas.style.cursor = "move";
        render();
      })
      .on("end", () => {
        canvas.style.cursor = "default";
      }),
  );
}

function baseScaleFit(
  projection: d3geo.GeoProjection,
  viewportSize: [number, number],
) {
  // padding in percentage of viewport size
  const padding = 0.1;
  const paddedSize: [number, number] = [
    viewportSize[0] * (1 - padding),
    viewportSize[1] * (1 - padding),
  ];
  projection.fitSize(paddedSize, { type: "Sphere" });
}

function baseScaleFill(
  projection: d3geo.GeoProjection,
  viewportSize: [number, number],
) {
  projection.fitSize(viewportSize, { type: "Sphere" });
  const maxDim = Math.max(viewportSize[0], viewportSize[1]);
  const scale = projection
    .fitSize([maxDim, maxDim], { type: "Sphere" })
    .scale();
  projection.scale(scale);
}

export const orthographic: Projection = {
  d3proj: d3geo.geoOrthographic,
  dragHandler: dragRotation,
  center: [0, 0],
  baseScaleHandler: baseScaleFit,
} as const;

export const orthographic180: Projection = {
  d3proj: d3geo.geoOrthographic,
  dragHandler: dragRotation,
  center: [180, 0],
  baseScaleHandler: baseScaleFit,
} as const;

export const mercator: Projection = {
  d3proj: d3geo.geoMercator,
  dragHandler: dragTranslation,
  center: [0, 0],
  baseScaleHandler: baseScaleFill,
} as const;

export const mercator180: Projection = {
  d3proj: d3geo.geoMercator,
  dragHandler: dragTranslation,
  center: [180, 0],
  baseScaleHandler: baseScaleFill,
} as const;

export const plateCarree: Projection = {
  d3proj: d3geo.geoEquirectangular,
  dragHandler: dragTranslation,
  center: [0, 0],
  baseScaleHandler: baseScaleFill,
} as const;

export const equalEarth: Projection = {
  d3proj: d3geo.geoEqualEarth,
  dragHandler: dragTranslation,
  center: [0, 0],
  baseScaleHandler: baseScaleFit,
} as const;

export class Globe {
  private baseScale: number;
  private projection: d3geo.GeoProjection;
  private scaleExtend: [number, number];
  private dragHandler: DragHandler;

  constructor(
    private viewportSize: [number, number],
    projection: Projection,
  ) {
    this.projection = projection
      .d3proj()
      .translate([this.viewportSize[0] / 2, this.viewportSize[1] / 2])
      .center(projection.center);

    // Set up base scale
    projection.baseScaleHandler(this.projection, this.viewportSize);
    this.dragHandler = projection.dragHandler;
    this.baseScale = this.projection.scale();
    this.scaleExtend = [this.setMinScaleExtend(), 8];
  }

  private setMinScaleExtend() {
    const fitScale = this.projection
      .fitSize([this.viewportSize[0], this.viewportSize[1]], { type: "Sphere" })
      .scale();
    const minScaleExtend = Math.min(fitScale / this.baseScale, 1);
    this.projection.scale(this.baseScale);
    return minScaleExtend;
  }

  project(coordinates: [number, number]): [number, number] | null {
    const path = d3geo.geoPath(this.projection);
    const visible = path({ type: "Point", coordinates: coordinates });
    if (!visible) {
      return null;
    }
    const result = this.projection(coordinates);
    return result ? [result[0], result[1]] : null;
  }
  invert(point: [number, number]): [number, number] | null {
    const result = this.projection.invert?.(point);
    if (result != null) {
      // Check if point is on the globe
      const rpoint = this.projection(result);
      if (rpoint == null) return null;
      if (
        Math.abs(point[0] - rpoint[0]) > 0.5 ||
        Math.abs(point[1] - rpoint[1]) > 0.5
      )
        return null;
      return result;
    }
    return null;
  }

  path(ctx: CanvasRenderingContext2D | null = null): d3geo.GeoPath {
    return d3geo.geoPath(this.projection, ctx);
  }

  setupInteractions(canvas: HTMLCanvasElement, render: () => void): void {
    canvas.style.touchAction = "none";
    this.dragHandler(this.projection, canvas, render);
    // Zoom (Scroll)
    this.zoomHandler(canvas, render);
  }

  private zoomHandler(canvas: HTMLCanvasElement, render: () => void) {
    d3select(canvas).call(
      d3zoom<HTMLCanvasElement, unknown>()
        .scaleExtent(this.scaleExtend)
        .on("zoom", (event) => {
          this.projection.scale(this.baseScale * event.transform.k);
          render();
        }),
    );
  }
}
