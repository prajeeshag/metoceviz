import * as d3 from "d3";

export function baseScaleFit(
  projection: d3.GeoProjection,
  viewportSize: [number, number],
) {
  const padding = 0.1;
  const paddedSize: [number, number] = [
    viewportSize[0] * (1 - padding),
    viewportSize[1] * (1 - padding),
  ];
  projection
    .fitSize(paddedSize, { type: "Sphere" })
    .translate([viewportSize[0] / 2, viewportSize[1] / 2]);
}

export function baseScaleFill(
  projection: d3.GeoProjection,
  viewportSize: [number, number],
) {
  projection.fitSize(viewportSize, { type: "Sphere" });
  const maxDim = Math.max(viewportSize[0], viewportSize[1]);
  const scale = projection
    .fitSize([maxDim, maxDim], { type: "Sphere" })
    .scale();
  projection.scale(scale).translate([viewportSize[0] / 2, viewportSize[1] / 2]);
}
