import { describe, expect, it } from "bun:test";
import { GridVector, type GridVectorProps } from "./grid-vector"; // Update this path

describe("GridVectorData", () => {
    const defaultProps: GridVectorProps = {
        xs: 0,
        ys: 0,
        dx: 1,
        dy: 1,
        nx: 3,
        ny: 3,
        islatlon: false,
        uUrl: "...",
        vUrl: "...",

    };

    const gridDataU = new Float32Array([
        10, 20, 30,
        40, 50, 60,
        70, 80, 90
    ]);
    const gridDataV = new Float32Array([
        1, 2, 3,
        4, 5, 6,
        7, 8, 9
    ]);

    const scalarGrid = new GridVector(defaultProps, [gridDataU, gridDataV]);

    describe("get()", () => {
        it("should return the correct value at specific indices", () => {
            expect(scalarGrid.get(0, 0)).toEqual([10, 1]);
            expect(scalarGrid.get(1, 1)).toEqual([50, 5]);
            expect(scalarGrid.get(2, 2)).toEqual([90, 9]);
        });

        it("should not return NaN for value 0", () => {
            const sparseData = new Float32Array(9);
            sparseData[0] = 0; // 0 is falsy in JS
            const sparseGrid = new GridVector(defaultProps, [sparseData, sparseData]);
            expect(sparseGrid.get(0, 0)).toEqual([0, 0]);
        });

        it("should return NaN for values that are outside the domain", () => {
            expect(scalarGrid.get(2, 3)).toEqual([NaN, NaN]);
        });

        it("should return NaN for NaN values", () => {
            const sparseData = new Float32Array(9);
            sparseData[0] = NaN; // 0 is falsy in JS
            const sparseGrid = new GridVector(defaultProps, [sparseData, sparseData]);
            expect(sparseGrid.get(0, 0)).toEqual([NaN, NaN]);
        });
    });

    describe("interpolateNearest()", () => {
        it("should return exact value when point is on a node", () => {
            expect(scalarGrid.interpolateNearest(1, 1)).toEqual([50, 5]);
        });

        it("should round to the closest neighbor", () => {
            // 1.2, 1.2 should round to 1, 1
            expect(scalarGrid.interpolateNearest(1.2, 1.2)).toEqual([50, 5]);
            // 1.6, 1.6 should round to 2, 2
            expect(scalarGrid.interpolateNearest(1.6, 1.6)).toEqual([90, 9]);
        });

        it("should return NaN when out of bounds", () => {
            expect(scalarGrid.interpolateNearest(-1, 0)).toEqual([NaN, NaN]);
            expect(scalarGrid.interpolateNearest(5, 5)).toEqual([NaN, NaN]);
        });

        it("should interpolate correctly in between 360 to 0 for periodic lon", () => {
            const props = {
                xs: 0,
                ys: 0,
                dx: 120.0, // 3 points: 0, 120, 240. Next would be 360 (wrap)
                dy: 10,
                nx: 3,
                ny: 3,
                islatlon: true,
                uUrl: "...",
                vUrl: "...",
            }
            const wrapGrid = new GridVector(props, [gridDataU, gridDataV])
            expect(wrapGrid.interpolateNearest(-120, 0)).toEqual([30, 3]);
            expect(wrapGrid.interpolateNearest(-65, 0)).toEqual([30, 3]);
            expect(wrapGrid.interpolateNearest(260, 0)).toEqual([30, 3]);
        });

        it("should interpolate correctly in between 180 to -180 periodic lon", () => {
            const props = {
                xs: -180,
                ys: 0,
                dx: 120.0, // 3 points: 0, 120, 240. Next would be 360 (wrap)
                dy: 10,
                nx: 3,
                ny: 3,
                islatlon: true,
                uUrl: "...",
                vUrl: "..."
            }
            const wrapGrid = new GridVector(props, [gridDataU, gridDataV])
            expect(wrapGrid.interpolateNearest(-300, 0)).toEqual([30, 3]);
            expect(wrapGrid.interpolateNearest(-200, 0)).toEqual([10, 1]);
            expect(wrapGrid.interpolateNearest(90, 0)).toEqual([30, 3]);
        });
    });

    describe("interpolateBilinear()", () => {

        it("should interpolate correctly in the center of a quad", () => {
            // Between (0,0)=10 and (1,0)=20 and (0,1)=40 and (1,1)=50
            // x=0.5, y=0.5 should be exactly 30
            // (10+20)/2 = 15; (40+50)/2 = 45; (15+45)/2 = 30
            expect(scalarGrid.interpolateBilinear(0.5, 0.5)).toEqual([30, 3]);
        });

        it("should return NaN if any corner is NaN", () => {
            const nanData = new Float32Array([10, NaN, 40, 50, 0, 0, 0, 0, 0]);
            const nanGrid = new GridVector(defaultProps, [nanData, nanData]);
            expect(nanGrid.interpolateBilinear(0.5, 0.5)).toEqual([NaN, NaN]);
        });

        it("should interpolate correctly in between 360 to 0 for periodic lon", () => {
            const props = {
                xs: 0,
                ys: 0,
                dx: 120.0, // 3 points: 0, 120, 240. Next would be 360 (wrap)
                dy: 10,
                nx: 3,
                ny: 3,
                islatlon: true,
                uUrl: "...",
                vUrl: "...",
            }
            const wrapGrid = new GridVector(props, [gridDataU, gridDataV])
            expect(wrapGrid.interpolateBilinear(-120, 0)).toEqual([30, 3]);
            expect(wrapGrid.interpolateBilinear(-60, 0)).toEqual([20, 2]);
            expect(wrapGrid.interpolateBilinear(-30, 0)).toEqual([15, 1.5]);
            expect(wrapGrid.interpolateBilinear(0, 0)).toEqual([10, 1]);
            expect(wrapGrid.interpolateBilinear(300, 0)).toEqual([20, 2]);
            expect(wrapGrid.interpolateBilinear(360, 0)).toEqual([10, 1]);
            expect(wrapGrid.interpolateBilinear(-180, 0)).toEqual([25, 2.5]);
        });

        it("should interpolate correctly in between 180 to -180 periodic lon", () => {
            const props = {
                xs: -180,
                ys: 0,
                dx: 120.0, // 3 points: 0, 120, 240. Next would be 360 (wrap)
                dy: 10,
                nx: 3,
                ny: 3,
                islatlon: true,
                uUrl: "...",
                vUrl: "...",
            }
            const wrapGrid = new GridVector(props, [gridDataU, gridDataV])
            expect(wrapGrid.interpolateBilinear(-300, 0)).toEqual([30, 3]);
            expect(wrapGrid.interpolateBilinear(-240, 0)).toEqual([20, 2]);
            expect(wrapGrid.interpolateBilinear(-180, 0)).toEqual([10, 1]);
            expect(wrapGrid.interpolateBilinear(60, 0)).toEqual([30, 3]);
            expect(wrapGrid.interpolateBilinear(90, 0)).toEqual([25, 2.5]);
            expect(wrapGrid.interpolateBilinear(180, 0)).toEqual([10, 1]);
            expect(wrapGrid.interpolateBilinear(210, 0)).toEqual([12.5, 1.25]);
        });
    });
});