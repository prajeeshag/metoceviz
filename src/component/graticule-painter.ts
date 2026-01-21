import { Globe } from "./globe";
import { Painter, type PainterProps } from "./painter";
import { geoGraticule } from "d3-geo";

interface GraticuleProp extends PainterProps {
  readonly globe: Globe;
  readonly strokeStyle?: string;
}

const defaultStrokeStyle: string = "rgba(255, 255, 255, 0.1)";

class GraticulePainter extends Painter<GraticuleProp> {
  async draw(canvas: HTMLCanvasElement, signal?: AbortSignal) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw Error("Canvas 2D context is null!");
    }
    context.beginPath();
    const strokeStyle = this.props.strokeStyle || defaultStrokeStyle;
    this.props.globe.geoPath(context)(geoGraticule()());
    context.strokeStyle = strokeStyle;
    context.stroke();
  }
}

export default function createGraticulePainter(
  props: GraticuleProp,
): GraticulePainter {
  return new GraticulePainter(props, null);
}
