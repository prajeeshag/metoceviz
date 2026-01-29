import { expect, test, describe, beforeEach } from "bun:test";
import { PixelNativeUtil } from "./pixel-native-utils";

describe("PixelNativeUtil", () => {
  const defaultProps = {
    gridStartPoint: [10, 10] as [number, number],
    gridEndPoint: [110, 110] as [number, number],
    gridSize: [11, 11] as [number, number], // 10 intervals, so 0-10 indices
    viewSize: [200, 200] as [number, number],
  };

  let util: PixelNativeUtil;

  beforeEach(() => {
    util = new PixelNativeUtil(defaultProps);
  });

  describe("canvasToGrid", () => {
    test("maps start point to (0, 0)", () => {
      const [gx, gy] = util.canvasToGrid(10, 10);
      expect(gx).toBe(0);
      expect(gy).toBe(0);
    });

    test("maps end point to (gridSize - 1)", () => {
      const [gx, gy] = util.canvasToGrid(110, 110);
      expect(gx).toBe(10);
      expect(gy).toBe(10);
    });

    test("maps midpoint correctly", () => {
      const [gx, gy] = util.canvasToGrid(60, 60);
      expect(gx).toBe(5);
      expect(gy).toBe(5);
    });

    test("handles points outside the grid range (extrapolation)", () => {
      const [gx, gy] = util.canvasToGrid(0, 0);
      // (0 - 10) / (110 - 10) = -0.1. -0.1 * (11-1) = -1
      expect(gx).toBe(-1);
      expect(gy).toBe(-1);
    });
  });

  describe("canvasGridBounds", () => {
    test("returns correct bounds when within viewSize", () => {
      const bounds = util.canvasGridBounds();
      expect(bounds).toEqual({
        x0: 10,
        x1: 110,
        y0: 10,
        y1: 110,
      });
    });

    test("clips bounds to viewSize when grid exceeds canvas", () => {
      const oversizedUtil = new PixelNativeUtil({
        gridStartPoint: [-50, -50],
        gridEndPoint: [300, 300],
        gridSize: [10, 10],
        viewSize: [200, 200],
      });

      const bounds = oversizedUtil.canvasGridBounds();
      expect(bounds.x0).toBe(0); // Clipped from -50
      expect(bounds.y0).toBe(0); // Clipped from -50
      expect(bounds.x1).toBe(199); // Clipped from 300 (viewSize[0] - 1)
      expect(bounds.y1).toBe(199); // Clipped from 300 (viewSize[1] - 1)
    });

    test("handles reversed start/end points (min/max logic)", () => {
      const reversedUtil = new PixelNativeUtil({
        gridStartPoint: [100, 100],
        gridEndPoint: [10, 10],
        gridSize: [10, 10],
        viewSize: [200, 200],
      });

      const bounds = reversedUtil.canvasGridBounds();
      expect(bounds.x0).toBe(10);
      expect(bounds.x1).toBe(100);
    });

    test("clips to viewSize and maintains integer types", () => {
      const util = new PixelNativeUtil({
        gridStartPoint: [0.5, 0.5],
        gridEndPoint: [500.5, 500.5],
        gridSize: [10, 10],
        viewSize: [200, 200],
      });

      const bounds = util.canvasGridBounds();
      expect(bounds.x0).toBe(0);
      expect(bounds.x1).toBe(199); // viewSize[0] - 1
      expect(Number.isInteger(bounds.x1)).toBe(true);
    });
  });
});
