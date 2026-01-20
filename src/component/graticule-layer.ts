import { Globe } from "./globe";
import { Provider, Agent } from "./types";
import { Canvas, type CanvasProps, createCanvasFn } from "./canvas";
import { geoGraticule, geoPath } from "d3-geo";

export interface GraticuleProp extends CanvasProps {
  readonly globe: Globe;
  readonly strokeStyle?: string;
}

const defaultStrokeStyle: string = "rgba(255, 255, 255, 0.1)";

export class GraticuleLayer extends Canvas<GraticuleProp> {}

async function drawGraticule(
  props: GraticuleProp,
  canvas: HTMLCanvasElement,
): Promise<void> {
  const context = canvas.getContext("2d");
  if (!context) {
    throw Error("Canvas 2D context is null!");
  }
  context.beginPath();
  const strokeStyle = props.strokeStyle || defaultStrokeStyle;
  geoPath(props.globe.projection, context)(geoGraticule()());
  context.strokeStyle = strokeStyle;
  context.stroke();
}

class GraticuleProvider extends Provider<GraticuleProp, GraticuleLayer> {}

class GraticuleAgent extends Agent<GraticuleProp, GraticuleLayer> {}

const createGraticuleLayer = createCanvasFn<GraticuleProp, GraticuleLayer>(
  GraticuleLayer,
  drawGraticule,
);

const graticuleProvider = new GraticuleProvider(createGraticuleLayer, 1);
export const graticuleAgent = new GraticuleAgent(graticuleProvider);
