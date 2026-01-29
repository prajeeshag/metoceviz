export class PixelNativeUtil {
  constructor(
    private readonly props: {
      readonly gridStartPoint: [number, number];
      readonly gridEndPoint: [number, number];
      readonly gridSize: [number, number];
      readonly viewSize: [number, number];
    },
  ) {}

  canvasToGrid(px: number, py: number): [number, number] {
    const tx =
      (px - this.props.gridStartPoint[0]) /
      (this.props.gridEndPoint[0] - this.props.gridStartPoint[0]);
    const ty =
      (py - this.props.gridStartPoint[1]) /
      (this.props.gridEndPoint[1] - this.props.gridStartPoint[1]);
    return [
      tx * (this.props.gridSize[0] - 1),
      ty * (this.props.gridSize[1] - 1),
    ];
  }

  canvasGridBounds() {
    const gx0 = Math.min(
      this.props.gridStartPoint[0],
      this.props.gridEndPoint[0],
    );
    const gx1 = Math.max(
      this.props.gridStartPoint[0],
      this.props.gridEndPoint[0],
    );
    const gy0 = Math.min(
      this.props.gridStartPoint[1],
      this.props.gridEndPoint[1],
    );
    const gy1 = Math.max(
      this.props.gridStartPoint[1],
      this.props.gridEndPoint[1],
    );
    return {
      x0: Math.floor(Math.max(0, gx0)),
      x1: Math.floor(Math.min(this.props.viewSize[0] - 1, gx1)),
      y0: Math.floor(Math.max(0, gy0)),
      y1: Math.floor(Math.min(this.props.viewSize[1] - 1, gy1)),
    };
  }
}
