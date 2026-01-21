import * as d3geo from "d3-geo";
import { drag as d3drag, type DragBehavior } from "d3-drag";
import { zoom as d3zoom, type ZoomBehavior } from "d3-zoom";
import versor from "versor";
import * as z from "zod";
import { ImmutableComponent, type ValidComponentProps } from "./types";

interface DragHandler {
  (
    globe: Globe,
    renderDrag: (globe: Globe) => void,
    renderEnd: (globe: Globe) => void,
  ): DragBehavior<HTMLCanvasElement, unknown, unknown>;
}

interface BaseScaleHandler {
  (projection: d3geo.GeoProjection, viewportSize: [number, number]): void;
}

interface Projection {
  d3proj: () => d3geo.GeoProjection;
  dragHandler: DragHandler;
  baseScaleHandler: BaseScaleHandler;
  scaleExtent: [number, number];
}

const DEFAULT_SCALE_EXTENT: [number, number] = [0.5, 8];

function dragRotation(
  globe: Globe,
  renderDrag: (globe: Globe) => void,
  renderEnd: (globe: Globe) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  let v0: [number, number];
  let r0: [number, number, number];
  let q0: number;

  return (
    d3drag<HTMLCanvasElement, unknown>()
      // FILTER: Only allow drag if it's NOT a two-finger touch (pinch)
      .filter((event) => {
        return !event.touches || event.touches.length < 2;
      })
      .on("start", (event) => {
        const r = globe.getRotation();
        // Convert current rotation to a versor (quaternion)
        const coord = globe.invert([event.x, event.y]);
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
        globe.setRotation(r0);
        const coord = globe.invert([event.x, event.y]);
        if (!coord) return;
        const v1 = versor.cartesian(coord);

        // 3. Calculate the rotation difference (the "delta" in 3D)
        const q1 = versor.multiply(q0, versor.delta(v0, v1));

        // Update the projection with the new rotation
        const angles = versor.rotation(q1);
        // fix to 2 decimal places
        const rot: [number, number, number] = [
          Math.round(angles[0] * 10) / 10,
          Math.round(angles[1] * 10) / 10,
          Math.round(angles[2] * 10) / 10,
        ];
        globe.setRotation(rot);
        const canvas = event.sourceEvent.target;
        canvas.style.cursor = "grabbing";
        renderDrag(globe);
      })
      .on("end", (event) => {
        const canvas = event.sourceEvent.target;
        canvas.style.cursor = "default";
        renderEnd(globe);
      })
  );
}

function dragRotationSimple(
  globe: Globe,
  renderDrag: (globe: Globe) => void,
  renderEnd: (globe: Globe) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  return d3drag<HTMLCanvasElement, unknown>()
    .filter((event) => !event.touches || event.touches.length < 2)
    .on("start", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "grabbing";
    })
    .on("drag", (event) => {
      // 1. Get current rotation [longitude, latitude, roll]
      const rotation = globe.getRotation();

      // 2. Calculate sensitivity
      // Higher scale (zoom) means smaller movement per pixel
      const scale = globe.getScale();
      const sensitivity = 75 / scale; // Adjust 75 to tweak the "feel"

      // 3. Apply the delta (change in mouse position)
      // d3.drag event.dx/dy provides the change since the last event
      const newRotation: [number, number, number] = [
        rotation[0] + event.dx * sensitivity,
        rotation[1] - event.dy * sensitivity,
        rotation[2], // Keep roll (tilt) at 0 or unchanged
      ];

      // 4. Constrain latitude to prevent the globe from flipping upside down
      // Max latitude should be 90, min -90
      newRotation[1] = Math.max(-90, Math.min(90, newRotation[1]));

      globe.setRotation(newRotation);
      renderDrag(globe);
    })
    .on("end", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "default";
      renderEnd(globe);
    });
}

function dragTranslation(
  globe: Globe,
  renderDrag: (globe: Globe) => void,
  renderEnd: (globe: Globe) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  let t0: [number, number];
  let p0: [number, number];

  return d3drag<HTMLCanvasElement, unknown>()
    .filter((event) => {
      return !event.touches || event.touches.length < 2;
    })
    .on("start", (event) => {
      t0 = globe.getTranslate();
      p0 = [event.x, event.y];
    })
    .on("drag", (event) => {
      if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
        return;
      }

      const dx = event.x - p0[0];
      const dy = event.y - p0[1];

      const point: [number, number] = [
        Math.round(t0[0] + dx),
        Math.round(t0[1] + dy),
      ];
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "move";
      globe.setTranslate(point);
      renderDrag(globe);
    })
    .on("end", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "default";
      renderEnd(globe);
    });
}

function dragTranslateWrapX(
  globe: Globe,
  renderDrag: (globe: Globe) => void,
  renderEnd: (globe: Globe) => void,
): DragBehavior<HTMLCanvasElement, unknown, unknown> {
  let t0: [number, number]; // Initial translation
  let r0: [number, number, number]; // Initial rotation [lambda, phi, gamma]
  let p0: [number, number]; // Initial mouse/touch point

  return d3drag<HTMLCanvasElement, unknown>()
    .filter((event) => {
      return !event.touches || event.touches.length < 2;
    })
    .on("start", (event) => {
      t0 = globe.getTranslate();
      r0 = globe.getRotation(); // Assuming globe.getRotation() returns [λ, φ, γ]
      p0 = [event.x, event.y];
    })
    .on("drag", (event) => {
      if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
        return;
      }

      // Calculate the change in mouse position
      const dx = event.x - p0[0];
      const dy = event.y - p0[1];

      // 1. Rotation for X (Horizontal move affects Longitude/Lambda)
      // Sensitivity factor (e.g., 0.25) adjusts how fast the globe spins
      const sensitivity = 0.25;
      const newRotation: [number, number, number] = [
        r0[0] + dx * sensitivity,
        r0[1],
        r0[2],
      ];

      // 2. Translation for Y (Vertical move affects Y translation)
      const newTranslate: [number, number] = [t0[0], Math.round(t0[1] + dy)];

      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "move";

      // Apply both updates
      globe.setRotation(newRotation);
      globe.setTranslate(newTranslate);

      renderDrag(globe);
    })
    .on("end", (event) => {
      const canvas = event.sourceEvent.target;
      canvas.style.cursor = "default";
      renderEnd(globe);
    });
}

function baseScaleFit(
  projection: d3geo.GeoProjection,
  viewportSize: [number, number],
) {
  const padding = 0.1;
  const paddedSize: [number, number] = [
    viewportSize[0] * (1 - padding),
    viewportSize[1] * (1 - padding),
  ];
  projection
    .fitSize(paddedSize, { type: "Sphere" })
    .translate([viewportSize[0] / 2, viewportSize[1] / 2]);
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
  projection.scale(scale).translate([viewportSize[0] / 2, viewportSize[1] / 2]);
}

const orthographic: Projection = {
  d3proj: d3geo.geoOrthographic,
  dragHandler: dragRotation,
  baseScaleHandler: baseScaleFit,
  scaleExtent: DEFAULT_SCALE_EXTENT,
} as const;

const mercator: Projection = {
  d3proj: d3geo.geoMercator,
  dragHandler: dragTranslateWrapX,
  baseScaleHandler: baseScaleFill,
  scaleExtent: DEFAULT_SCALE_EXTENT,
} as const;

const plateCarree: Projection = {
  d3proj: d3geo.geoEquirectangular,
  dragHandler: dragTranslateWrapX,
  baseScaleHandler: baseScaleFill,
  scaleExtent: DEFAULT_SCALE_EXTENT,
} as const;

const equalEarth: Projection = {
  d3proj: d3geo.geoEqualEarth,
  dragHandler: dragTranslateWrapX,
  baseScaleHandler: baseScaleFit,
  scaleExtent: DEFAULT_SCALE_EXTENT,
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

interface GlobeConfig {
  proj: Projections;
  viewSize: [number, number];
}

export class Globe extends ImmutableComponent<GlobeConfig, null> {
  private _projection: d3geo.GeoProjection;
  private scaleExtent: [number, number];

  constructor(props: {
    proj: Projections;
    viewSize: [number, number];
    rot?: [number, number, number];
    trans?: [number, number];
    scale?: number;
    scaleExtent?: [number, number];
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

    super({ proj: props.proj, viewSize: props.viewSize }, null);
    this._projection = d3proj;
    this.scaleExtent = props.scaleExtent || projConfig.scaleExtent;
  }

  projectviz(coordinates: [number, number]): [number, number] | null {
    const visible = d3geo.geoPath(this._projection)({
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

  setRotation(rotation: [number, number, number]) {
    this._projection.rotate(rotation);
  }

  setTranslate(trans: [number, number]) {
    this._projection.translate(trans);
  }

  setScale(scale: number) {
    this._projection.scale(scale);
  }

  getRotation(): [number, number, number] {
    return this._projection.rotate();
  }

  getTranslate(): [number, number] {
    return this._projection.translate();
  }

  getScale(): number {
    return this._projection.scale();
  }

  geoPath(ctx: CanvasRenderingContext2D) {
    return d3geo.geoPath(this._projection, ctx);
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
        console.info(transform.k, newScale);
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
    return JSON.stringify({
      proj: proj,
      viewSize: viewSize,
      rot: rot,
      trans: trans,
      scale: scale,
    });
  }
}
