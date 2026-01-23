import { JsonData } from "../json-data";
import { feature } from "topojson-client";
import { Globe } from "../globe";
import { Painter, type PainterProps } from "./painter";

interface LandProps extends PainterProps {
  readonly landJson: JsonData;
  readonly globe: Globe;
  readonly strokeStyle?: string;
  readonly lineWidth?: number;
}

class LandPainter extends Painter<LandProps> {
  async draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void> {
    const topoJson = this.props.landJson.value;
    const land = feature(topoJson, topoJson.objects.land);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw Error("Canvas 2D context is null!");
    }
    ctx.beginPath();
    ctx.strokeStyle = this.props.strokeStyle || "#f7faf8ff";
    ctx.lineWidth = this.props.lineWidth || 1;
    this.props.globe.geoPath(ctx)(land);
    ctx.stroke();
  }
}

export default function createLandPainter(props: LandProps) {
  return new LandPainter(props, null);
}
