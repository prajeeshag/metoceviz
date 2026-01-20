import { Globe } from "./component/globe";
import { graticuleAgent } from "./component/graticule-layer";
import { landLayerAgent } from "./component/land-layer";
import { jsonDataAgent } from "./component/json-data";

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
    this.container.classList.add("canvas-stack");
    const globe = new Globe(
      {
        proj: this.projection,
        viewSize: this.viewSize,
      },
      null,
    );

    const graticule = await graticuleAgent.get({
      width: this.viewSize[0],
      height: this.viewSize[1],
      globe: globe,
    });

    const landJson = await jsonDataAgent.get({ url: this.landUrl });

    const landLayer = await landLayerAgent.get({
      width: this.viewSize[0],
      height: this.viewSize[1],
      topoJson: landJson,
      globe: globe,
      strokeStyle: "rgba(16, 107, 181, 0.5)",
    });
    this.container.appendChild(landLayer.value);
    this.container.appendChild(graticule.value);
  }
}
