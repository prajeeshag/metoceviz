import { Globe } from "./component/globe";
import getgraticulePainter from "./component/graticule-painter";
import getlandPainter from "./component/land-painter";
import { jsonDataAgent } from "./component/json-data";
import { gridAgent } from "./component/grid-data";
import { createPixelFieldAgent } from "./component/pixel-field";
import getPColorPainter from "./component/pcolor-painter";
import { Canvas } from "./component/canvas";
import * as d3 from "d3-selection";

export class MapViz {
  private landUrl = "/land-110m.json";
  private uwndUrl = "/ncepv2_winds.zarr/uwnd";
  private canvas: Canvas;

  constructor(
    readonly container: HTMLDivElement,
    readonly projection: "mercator" | "orthographic",
    readonly viewSize: [number, number],
  ) {
    this.container.classList.add("canvas-stack");
    const globe = new Globe({
      proj: this.projection,
      viewSize: this.viewSize,
    });

    this.canvas = new Canvas(this.viewSize[0], this.viewSize[1], []);

    this.container.appendChild(this.canvas.canvas);

    this.render(globe);
    this.setupInteractions(globe);
  }

  async renderStatic(globe: Globe) {
    const landJson = await jsonDataAgent.get({ url: this.landUrl });
    const landPainter = getlandPainter({
      globe: globe,
      landJson: landJson,
    });

    const graticulePainter = getgraticulePainter({
      globe: globe,
    });

    this.canvas.clearPainters();
    this.canvas.addPainter(landPainter);
    this.canvas.addPainter(graticulePainter);
    await this.canvas.render();
  }

  async render(globe: Globe) {
    const grid = await gridAgent.get({
      url: this.uwndUrl,
      tIndex: 1,
    });

    const landJson = await jsonDataAgent.get({ url: this.landUrl });
    const landPainter = getlandPainter({
      globe: globe,
      landJson: landJson,
    });

    const graticulePainter = getgraticulePainter({
      globe: globe,
    });

    const field = await createPixelFieldAgent().get({
      grid: grid,
      globe: globe,
      width: this.viewSize[0],
      height: this.viewSize[1],
    });

    const pcolorPainter = getPColorPainter({
      field: field,
    });

    this.canvas.clearPainters();
    this.canvas.addPainter(pcolorPainter);
    this.canvas.addPainter(landPainter);
    this.canvas.addPainter(graticulePainter);
    await this.canvas.render();
  }

  setupInteractions(globe: Globe) {
    const dragHandler = globe.dragHandler(
      (globe) => this.renderStatic(globe),
      (globe) => this.render(globe),
    );
    const zoomHandler = globe.zoomHandler(
      (globe) => this.renderStatic(globe),
      (globe) => this.render(globe),
    );
    d3.select(this.canvas.canvas).call(dragHandler).call(zoomHandler);
  }
}
