import * as d3geo from "d3-geo";
import { select as d3select } from "d3-selection";
import { drag as d3drag } from "d3-drag";
import { zoom as d3zoom } from "d3-zoom";
import versor from "versor";
import * as z from "zod";
import { ImmutableComponent } from "./types";

interface DragHandler {
  (
    projection: d3geo.GeoProjection,
    canvas: HTMLCanvasElement,
    render: (globe: Globe) => void,
  ): void;
}

interface BaseScaleHandler {
  (projection: d3geo.GeoProjection, viewportSize: [number, number]): void;
}

interface Projection {
  d3proj: () => d3geo.GeoProjection;
  dragHandler: DragHandler;
  baseScaleHandler: BaseScaleHandler;
}

function dragRotation(
  globe: Globe,
  canvas: HTMLCanvasElement,
  render: (globe: Globe) => void,
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
        const r = globe.projection.rotate();
        // Convert current rotation to a versor (quaternion)
        const coord = globe.projection.invert?.([event.x, event.y]);
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
        const coord = globe.projection.rotate(r0).invert?.([event.x, event.y]);
        if (!coord) return;
        const v1 = versor.cartesian(coord);

        // 3. Calculate the rotation difference (the "delta" in 3D)
        const q1 = versor.multiply(q0, versor.delta(v0, v1));

        // Update the projection with the new rotation
        const angles = versor.rotation(q1);
        // fix to 2 decimal places
        const rot = [
          Math.round(angles[0] * 10) / 10,
          Math.round(angles[1] * 10) / 10,
          Math.round(angles[2] * 10) / 10,
        ];
        const globeCopy = globe.copy({ rot });
        canvas.style.cursor = "grabbing";
        render({ projection });
      })
      .on("end", () => {
        canvas.style.cursor = "default";
      }),
  );
}

function dragTranslation(
  projection: d3geo.GeoProjection,
  canvas: HTMLCanvasElement,
  render: (globe: Globe) => void,
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
        const point: [number, number] = [
          Math.round(t0[0] + dx),
          Math.round(t0[1] + dy),
        ];
        projection.translate(point);
        canvas.style.cursor = "move";
        render({ projection });
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

const orthographic: Projection = {
  d3proj: d3geo.geoOrthographic,
  dragHandler: dragRotation,
  baseScaleHandler: baseScaleFit,
} as const;

const mercator: Projection = {
  d3proj: d3geo.geoMercator,
  dragHandler: dragTranslation,
  baseScaleHandler: baseScaleFill,
} as const;

const plateCarree: Projection = {
  d3proj: d3geo.geoEquirectangular,
  dragHandler: dragTranslation,
  baseScaleHandler: baseScaleFill,
} as const;

const equalEarth: Projection = {
  d3proj: d3geo.geoEqualEarth,
  dragHandler: dragTranslation,
  baseScaleHandler: baseScaleFit,
} as const;

const Projections = z.enum([
  "orthographic",
  "mercator",
  "plateCarree",
  "equalEarth",
]);

export type Projections = z.infer<typeof Projections>;

const PROJECTIONS: Record<Projections, Projection> = {
  orthographic,
  mercator,
  plateCarree,
  equalEarth,
};

const GlobeConfig = z.object({
  proj: Projections,
  viewSize: z.tuple([z.number(), z.number()]),
  rot: z.tuple([z.number(), z.number(), z.number()]).optional(),
  trans: z.tuple([z.number(), z.number()]).optional(),
  scale: z.number().nullable().optional(),
});

type GlobeConfig = z.infer<typeof GlobeConfig>;

export class Globe extends ImmutableComponent<GlobeConfig, null> {
  public get projection() {
    const projConfig = PROJECTIONS[this.props.proj];
    const d3proj = projConfig.d3proj();
    d3proj
      .translate([this.props.viewSize[0] / 2, this.props.viewSize[1] / 2])
      .clipExtent([[0, 0], [...this.props.viewSize]]);

    projConfig.baseScaleHandler(d3proj, [...this.props.viewSize]);

    if (this.props.rot) {
      d3proj.rotate([...this.props.rot]);
    }
    if (this.props.trans) {
      d3proj.translate([...this.props.trans]);
    }
    if (this.props.scale) {
      d3proj.scale(this.props.scale);
    }
    return d3proj;
  }

  project(coordinates: [number, number]): [number, number] | null {
    const visible = d3geo.geoPath(this.projection)({
      type: "Point",
      coordinates: coordinates,
    });
    if (!visible) {
      return null;
    }
    const result = this.projection(coordinates);
    return result ? [result[0], result[1]] : null;
  }

  invert(point: [number, number]): [number, number] | null {
    const coords = this.projection.invert?.(point);
    if (!coords) return null;

    const reprojected = this.projection(coords);

    if (
      !reprojected ||
      Math.abs(point[0] - reprojected[0]) > 0.5 ||
      Math.abs(point[1] - reprojected[1]) > 0.5
    ) {
      return null;
    }

    return coords;
  }
}
