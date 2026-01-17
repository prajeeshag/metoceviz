import * as topojson from "topojson-client";
import { Globe } from "./services/globe/globe";
import * as d3 from "d3-geo";

interface MapOptions {
  projection: "mercator" | "orthographic";
  container: HTMLDivElement;
  landUrl?: string;
  theme?: {
    ocean: string;
    land: string;
  };
}

export class MapViz {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private globe: Globe;

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

    this.globe = new Globe({ proj: options.projection, rot: [-83, 0, 0] }, [
      this.canvas.width,
      this.canvas.height,
    ]);

    this.init(options);
  }

  private init(options: MapOptions): void {
    const {
      landUrl = "https://unpkg.com/world-atlas@2/land-110m.json",
      theme = { ocean: "#0b1d3a", land: "#3aa655" },
    } = options;

    this.setupInteractions();

    // Load Geometry
    fetch(landUrl)
      .then((r) => r.json())
      .then((world) => {
        this.land = topojson.feature(world, world.objects.land);
        this.render();
      });

    // Handle Resize
    window.addEventListener("resize", () => {
      this.render();
    });
  }

  private setupInteractions(): void {
    this.canvas.style.touchAction = "none";
    this.globe.setupInteractions(this.canvas, this.render.bind(this));
  }

  public render(): void {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, width, height);

    // 1. Draw Ocean
    ctx.beginPath();
    this.globe.path(ctx)({ type: "Sphere" });
    ctx.fillStyle = "#0f62e8ff";
    ctx.fill();

    // 2. Draw Land
    if (this.land) {
      ctx.beginPath();
      ctx.strokeStyle = "#f7faf8ff";
      ctx.lineWidth = 1;
      this.globe.path(ctx)(this.land);
      ctx.stroke();
    }

    // 3. Draw Grid/Graticule (Optional but helpful for poles)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    this.globe.path(ctx)(d3.geoGraticule()());
    ctx.stroke();

    const point = { type: "Point", coordinates: [0, 0] };
    ctx.beginPath();
    this.globe.path(ctx)(point); // This handles the clipAngle and clipExtent automatically!
    ctx.fillStyle = "red";
    ctx.fill();
  }
}
