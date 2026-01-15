import * as d3 from "d3";
import * as topojson from "topojson-client";
import versor from "versor";

interface MapOptions {
    canvas: HTMLCanvasElement;
    landUrl?: string;
    theme?: {
        ocean: string;
        land: string;
    };
}

export class MapViz {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private projection: d3.GeoProjection;
    private path: d3.GeoPath<any, d3.GeoPermissibleObjects>;

    private land: any = null;
    private baseScale: number = 0;
    private currentScale: number = 0;
    private v0: [number, number] = [0, 0];
    private r0: [number, number, number] = [0, 0, 0];
    private q0: [number, number] = [0, 0];

    constructor(options: MapOptions) {
        this.canvas = options.canvas;
        const context = this.canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not get 2D context from canvas element");
        }

        this.ctx = context;

        // Initialize Projection
        this.projection = d3.geoOrthographic()
            .clipAngle(90)
            .precision(0.5);

        this.path = d3.geoPath(this.projection, this.ctx);

        this.init(options);
    }

    private init(options: MapOptions): void {
        const {
            landUrl = "https://unpkg.com/world-atlas@2/land-110m.json",
            theme = { ocean: "#0b1d3a", land: "#3aa655" }
        } = options;

        this.updateDimensions();
        this.setupInteractions();

        // Load Geometry
        fetch(landUrl)
            .then(r => r.json())
            .then(world => {
                this.land = topojson.feature(world, world.objects.land);
                this.render();
            });

        // Handle Resize
        window.addEventListener("resize", () => {
            this.updateDimensions();
            this.render();
        });
    }

    private updateDimensions(): void {
        // Note: This assumes you want the canvas to fill the window. 
        // If you want it to fill a container, use this.canvas.parentElement clientWidth/Height.
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Recalculate scale if it's the first run
        if (this.baseScale === 0) {
            this.baseScale = Math.min(this.canvas.width, this.canvas.height) * 0.45;
            this.currentScale = this.baseScale;
        }

        this.projection
            .scale(this.currentScale)
            .translate([this.canvas.width / 2, this.canvas.height / 2]);
    }

    private setupInteractions(): void {
        this.canvas.style.touchAction = "none";
        const selection = d3.select(this.canvas);

        // Rotation (Drag)
        selection.call(
            d3.drag<HTMLCanvasElement, unknown>()
                // FILTER: Only allow drag if it's NOT a two-finger touch (pinch)
                .filter((event) => {
                    return !event.touches || event.touches.length < 2;
                })
                .on("start", (event) => {
                    const r = this.projection.rotate();
                    // Convert current rotation to a versor (quaternion)
                    this.v0 = versor.cartesian(this.projection.invert?.([event.x, event.y]));
                    this.r0 = r;
                    this.q0 = versor(r);
                })
                .on("drag", (event) => {
                    // CRITICAL: If a second finger touches mid-drag, stop rotating immediately
                    if (event.sourceEvent.touches && event.sourceEvent.touches.length > 1) {
                        return;
                    }
                    // 2. Calculate the current mouse position in 3D cartesian space
                    const v1 = versor.cartesian(this.projection.rotate(this.r0).invert?.([event.x, event.y]));

                    // 3. Calculate the rotation difference (the "delta" in 3D)
                    const q1 = versor.multiply(this.q0, versor.delta(this.v0, v1));

                    // 4. Update the projection with the new rotation
                    this.projection.rotate(versor.rotation(q1));

                    this.render();
                })
        );

        // Zoom (Scroll)
        selection.call(
            d3.zoom<HTMLCanvasElement, unknown>()
                .scaleExtent([0.5, 8])
                .on("zoom", (event) => {
                    this.currentScale = this.baseScale * event.transform.k;
                    this.projection.scale(this.currentScale);
                    this.render();
                })
        );
    }

    public render(): void {
        const { width, height } = this.canvas;
        const r = this.projection.scale();
        const ctx = this.ctx;

        ctx.clearRect(0, 0, width, height);

        // 1. Draw Ocean
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, r, 0, 2 * Math.PI);
        ctx.fillStyle = "#0b1d3a";
        ctx.fill();

        // 2. Draw Land
        if (this.land) {
            ctx.beginPath();
            ctx.strokeStyle = "#3aa655";
            ctx.lineWidth = 1;
            this.path(this.land);
            ctx.stroke();
        }

        // 3. Draw Grid/Graticule (Optional but helpful for poles)
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,255,255,0.1)";
        this.path(d3.geoGraticule()());
        ctx.stroke();
    }

    /**
     * Set rotation manually (e.g., to focus on a pole)
     * @param coords [longitude, latitude]
     */
    public setView(coords: [number, number]): void {
        this.projection.rotate([-coords[0], -coords[1]]);
        this.render();
    }
}