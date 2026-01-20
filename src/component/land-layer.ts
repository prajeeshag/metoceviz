import { JsonData } from "./json-data";
import { feature } from "topojson-client";
import { Globe } from "./globe";
import { geoPath } from "d3-geo";
import { Provider, Agent } from "./types";
import { Canvas, type CanvasProps, createCanvasFn } from "./canvas";

export interface LandLayerProps extends CanvasProps {
  readonly topoJson: JsonData;
  readonly globe: Globe;
  readonly strokeStyle?: string;
  readonly lineWidth?: number;
}

export class LandLayer extends Canvas<LandLayerProps> {}

async function drawLand(
  props: LandLayerProps,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const topoJson = props.topoJson.value;
  const land = feature(topoJson, topoJson.objects.land);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw Error("Canvas 2D context is null!");
  }
  ctx.beginPath();
  ctx.strokeStyle = props.strokeStyle || "#f7faf8ff";
  ctx.lineWidth = props.lineWidth || 1;
  geoPath(props.globe.projection, ctx)(land);
  ctx.stroke();
}

const createLandCanvas = createCanvasFn(LandLayer, drawLand);

class LandLayerProvider extends Provider<LandLayerProps, LandLayer> {}

class LandLayerAgent extends Agent<LandLayerProps, LandLayer> {}

export const landLayerAgent = new LandLayerAgent(
  new LandLayerProvider(createLandCanvas),
);
