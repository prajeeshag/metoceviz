import { Painter, type PainterProps } from "./painter";
import type { PixelField } from "../pixel-field";
import { logger } from "../../logger";
import * as d3 from "d3";

interface PColorLayerProps extends PainterProps {
  readonly field: PixelField;
}

class PColorPainter extends Painter<PColorLayerProps> {
  private readonly log = logger.child({ component: "PColorPainter" });

  async draw(canvas: HTMLCanvasElement, signal: AbortSignal) {
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const imgData = ctx.createImageData(canvas.width, canvas.height);

    const rgba = imgData.data;

    const pixelField = this.props.field.value;
    const min = d3.min(pixelField) as number;
    const max = d3.max(pixelField) as number;

    // This replaces manual normalization
    const colorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain([min, max]) // Set the data bounds here
      .clamp(true); // Optional: keeps values outside domain from breaking

    for (let i = 0; i < pixelField.length; i++) {
      const val = pixelField[i];
      const pos = i * 4;

      // 1. Check for NaN
      if (!val || isNaN(val)) {
        rgba[pos + 3] = 0;
        continue;
      }

      // 2. Normal coloring logic for valid numbers
      const { r, g, b } = d3.rgb(colorScale(val));
      rgba[pos] = r;
      rgba[pos + 1] = g;
      rgba[pos + 2] = b;
      rgba[pos + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
  }
}

export default function createPColorPainter(props: PColorLayerProps) {
  return new PColorPainter(props, null);
}

class WindIntensityColorScale {
    private result: string[];
    private maxWind: number;
    
    constructor(step: number, maxWind: number) {
        this.result = [];
        this.maxWind = maxWind;
        for (var j = 85; j <= 255; j += step) {
            this.result.push(this.asColorStyle(j, j, j, 1.0));
        }
    }
    
    private asColorStyle(r: number, g: number, b: number, a: number) {
        return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
    
    indexFor(m: number) {  // map wind speed to a style
        return Math.floor(Math.min(m, this.maxWind) / this.maxWind * (this.result.length - 1));
    }
}

function isMobile() {
    return (/android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i).test(navigator.userAgent);
}