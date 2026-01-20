import { Globe } from "./component/globe";
import { graticuleAgent } from "./component/graticule-layer";

export class MapViz {
  private landUrl = "https://unpkg.com/world-atlas@2/land-110m.json";

  constructor(
    readonly container: HTMLDivElement,
    readonly projection: "mercator" | "orthographic",
    readonly viewSize: [number, number],
  ) {
    this.render();
  }

  async render() {
    const globe = new Globe({
      proj: this.projection,
      viewSize: this.viewSize,
    });

    const graticule = await graticuleAgent.get({
      width: this.viewSize[0],
      height: this.viewSize[1],
      globe: globe,
    });

    this.container.appendChild(graticule.canvas);
  }
}
