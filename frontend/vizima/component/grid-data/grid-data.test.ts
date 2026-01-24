import { describe, expect, it } from "bun:test";
import { GridScalarData, type GridScalarProps } from "./grid-data"; // Update this path

describe("GridScalarData", () => {
    const defaultProps: GridScalarProps = {
        xs: 0,
        ys: 0,
        dx: 1,
        dy: 1,
        nx: 3,
        ny: 3,
        islatlon: false,
        url: "http://example.com/data.bin",
    };

    const gridData = new Float32Array([
        10, 20, 30,
        40, 50, 60,
        70, 80, 90
    ]);

    const scalarGrid = new GridScalarData(defaultProps, gridData);

    describe("get()", () => {
        it("should return the correct value at specific indices", () => {
            expect(scalarGrid.get(0, 0)).toBe(10);
            expect(scalarGrid.get(1, 1)).toBe(50);
            expect(scalarGrid.get(2, 2)).toBe(90);
        });

        it("should not return NaN for value 0", () => {
            const sparseData = new Float32Array(9);
            sparseData[0] = 0; // 0 is falsy in JS
            const sparseGrid = new GridScalarData(defaultProps, sparseData);
            expect(sparseGrid.get(0, 0)).toBe(0);
        });

        it("should return NaN for values that are outside the domain", () => {
            expect(scalarGrid.get(2, 3)).toBeNaN();
        });

        it("should return NaN for NaN values", () => {
            const sparseData = new Float32Array(9);
            sparseData[0] = NaN; // 0 is falsy in JS
            const sparseGrid = new GridScalarData(defaultProps, sparseData);
            expect(sparseGrid.get(0, 0)).toBeNaN();
        });
    });

    describe("interpolateNearest()", () => {
        it("should return exact value when point is on a node", () => {
            expect(scalarGrid.interpolateNearest(1, 1)).toBe(50);
        });

        it("should round to the closest neighbor", () => {
            // 1.2, 1.2 should round to 1, 1
            expect(scalarGrid.interpolateNearest(1.2, 1.2)).toBe(50);
            // 1.6, 1.6 should round to 2, 2
            expect(scalarGrid.interpolateNearest(1.6, 1.6)).toBe(90);
        });

        it("should return NaN when out of bounds", () => {
            expect(scalarGrid.interpolateNearest(-1, 0)).toBeNaN();
            expect(scalarGrid.interpolateNearest(5, 5)).toBeNaN();
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
                url: "...",
            }
            const wrapGrid = new GridScalarData(props, gridData)
            expect(wrapGrid.interpolateNearest(-120, 0)).toBe(30);
            expect(wrapGrid.interpolateNearest(-65, 0)).toBe(30);
            expect(wrapGrid.interpolateNearest(260, 0)).toBe(30);
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
                url: "...",
            }
            const wrapGrid = new GridScalarData(props, gridData)
            expect(wrapGrid.interpolateNearest(-300, 0)).toBe(30);
            expect(wrapGrid.interpolateNearest(-200, 0)).toBe(10);
            expect(wrapGrid.interpolateNearest(90, 0)).toBe(30);
        });
    });

    describe("interpolateBilinear()", () => {

        it("should interpolate correctly in the center of a quad", () => {
            // Between (0,0)=10 and (1,0)=20 and (0,1)=40 and (1,1)=50
            // x=0.5, y=0.5 should be exactly 30
            // (10+20)/2 = 15; (40+50)/2 = 45; (15+45)/2 = 30
            expect(scalarGrid.interpolateBilinear(0.5, 0.5)).toBe(30);
        });

        it("should return NaN if any corner is NaN", () => {
            const nanData = new Float32Array([10, NaN, 40, 50, 0, 0, 0, 0, 0]);
            const nanGrid = new GridScalarData(defaultProps, nanData);
            expect(nanGrid.interpolateBilinear(0.5, 0.5)).toBeNaN();
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
                url: "...",
            }
            const wrapGrid = new GridScalarData(props, gridData)
            expect(wrapGrid.interpolateBilinear(-120, 0)).toBe(30);
            expect(wrapGrid.interpolateBilinear(-60, 0)).toBe(20);
            expect(wrapGrid.interpolateBilinear(-30, 0)).toBe(15);
            expect(wrapGrid.interpolateBilinear(0, 0)).toBe(10);
            expect(wrapGrid.interpolateBilinear(300, 0)).toBe(20);
            expect(wrapGrid.interpolateBilinear(360, 0)).toBe(10);
            expect(wrapGrid.interpolateBilinear(-180, 0)).toBe(25);
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
                url: "...",
            }
            const wrapGrid = new GridScalarData(props, gridData)
            expect(wrapGrid.interpolateBilinear(-300, 0)).toBe(30);
            expect(wrapGrid.interpolateBilinear(-240, 0)).toBe(20);
            expect(wrapGrid.interpolateBilinear(-180, 0)).toBe(10);
            expect(wrapGrid.interpolateBilinear(60, 0)).toBe(30);
            expect(wrapGrid.interpolateBilinear(90, 0)).toBe(25);
            expect(wrapGrid.interpolateBilinear(180, 0)).toBe(10);
            expect(wrapGrid.interpolateBilinear(210, 0)).toBe(12.5);
        });

        it("should interpolate periodic lon within precision errors", () => {
            const props = {
                xs: 0,
                ys: 0,
                dx: 120.00000001, // 3 points: 0, 120, 240. Next would be 360 (wrap)
                dy: 10,
                nx: 3,
                ny: 3,
                islatlon: true,
                url: "...",
            }
            const wrapGrid = new GridScalarData(props, gridData)
            expect(wrapGrid.interpolateBilinear(-120, 0)).toBeCloseTo(30);
            expect(wrapGrid.interpolateBilinear(-60, 0)).toBeCloseTo(20);
        })
    });
});