import { Globe } from "./component/globe";
import { graticuleAgent } from "./component/graticule-layer";
import { landLayerAgent } from "./component/land-layer";
import { jsonDataAgent } from "./component/json-data";
import { gridAgent } from "./component/grid-data";
import { pixelFieldAgent } from "./component/pixel-field";
import { pcolorLayerAgent } from "./component/pcolor-layer";

export class MapViz {
  private landUrl = "/land-110m.json";
  private uwndUrl = "/ncepv2_winds.zarr/uwnd";
  private vwndUrl = "/ncepv2_winds.zarr/vwnd";

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
        rot: [-180, 0, 0],
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
      strokeStyle: "rgba(241, 244, 246, 0.75)",
    });
    const grid = await gridAgent.get({
      url: this.uwndUrl,
      tIndex: 1,
    });

    const field = await pixelFieldAgent.get({
      grid: grid,
      globe: globe,
      width: this.viewSize[0],
      height: this.viewSize[1],
    });

    const pcolorLayer = await pcolorLayerAgent.get({
      field: field,
      width: this.viewSize[0],
      height: this.viewSize[1],
    });

    this.container.appendChild(pcolorLayer.value);
    this.container.appendChild(landLayer.value);
    this.container.appendChild(graticule.value);
  }
}
