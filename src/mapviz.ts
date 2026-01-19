import * as topojson from "topojson-client";
import { Globe } from "./services/globe/globe";
import { GraticuleLayer } from "./services/layers/graticule_layer";
import * as d3geo from "d3-geo";
import { ImmutableComponent } from "./component/types";

interface MapOptions {
  projection: "mercator" | "orthographic";
  container: HTMLDivElement;
  landUrl?: string;
  theme?: {
    ocean: string;
    land: string;
  };
}

class User extends ImmutableComponent<{
  name: string;
  rot?: readonly [number, number, number] | undefined;
  trans?: readonly [number, number] | undefined;
  scale?: number | undefined;
}> {}

const u1 = new User({ name: "Alice", rot: [0, 0, 0] });
const u2 = new User({ rot: [0, 0, 0], name: "Alice" });

export class MapViz {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private land: any = null;

  constructor(options: MapOptions) {
    this.canvas = document.createElement("canvas");
    options.container.appendChild(this.canvas);

    this.canvas.width = 600;
    this.canvas.height = 400;
    const context = this.canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not get 2D context from canvas element");
    }

    this.ctx = context;

    this.init(options);
  }

  private init(options: MapOptions): void {
    const {
      landUrl = "https://unpkg.com/world-atlas@2/land-110m.json",
      theme = { ocean: "#0b1d3a", land: "#3aa655" },
    } = options;

    // this.setupInteractions();

    const globe = new Globe({
      proj: options.projection,
      viewSize: [this.canvas.width, this.canvas.height],
    });

    // Load Geometry
    fetch(landUrl)
      .then((r) => r.json())
      .then((world) => {
        this.land = topojson.feature(world, world.objects.land);
        this.render(globe);
      });

    // Handle Resize
    window.addEventListener("resize", () => {
      this.render(globe);
    });
  }

  //   private setupInteractions(): void {
  //     this.canvas.style.touchAction = "none";
  //     this.globe.setupInteractions(this.canvas, this.render.bind(this));
  //   }

  public render(globe: Globe): void {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Ocean
    ctx.beginPath();
    d3geo.geoPath(globe.projection, ctx)({ type: "Sphere" });
    ctx.fillStyle = "#0f62e8ff";
    ctx.fill();

    // 2. Draw Land
    if (this.land) {
      ctx.beginPath();
      ctx.strokeStyle = "#f7faf8ff";
      ctx.lineWidth = 1;
      d3geo.geoPath(globe.projection, ctx)(this.land);
      ctx.stroke();
    }

    // 3. Draw Grid/Graticule (Optional but helpful for poles)
    new GraticuleLayer(globe).draw(ctx);
  }
}
