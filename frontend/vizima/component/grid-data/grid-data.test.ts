import { describe, expect, it } from "bun:test";
import { GridData, type GridConfig } from "./grid-data"; // Update this path

describe("GridScalarData", () => {
    const gridData = new Float32Array([
        10, 20, 30,
        40, 50, 60,
        70, 80, 90
    ]);

    const scalarGrid = new GridData(0, 0, 3, 3, gridData);

    describe("get()", () => {
        it("should return the correct value at specific indices", () => {
            expect(scalarGrid.get(0, 0)).toBe(10);
            expect(scalarGrid.get(1, 1)).toBe(50);
            expect(scalarGrid.get(2, 2)).toBe(90);
        });

        it("should not return NaN for value 0", () => {
            const sparseData = new Float32Array(9);
            sparseData[0] = 0; // 0 is falsy in JS
            const sparseGrid = new GridData(1, 2, 3, 3, sparseData);
            expect(sparseGrid.get(1, 2)).toBe(0);
        });

        it("should return NaN for values that are outside the domain", () => {
            expect(scalarGrid.get(2, 3)).toBeNaN();
            expect(scalarGrid.get(0, 3)).toBeNaN();
            expect(scalarGrid.get(3, 0)).toBeNaN();
            expect(scalarGrid.get(-1, 0)).toBeNaN();
            expect(scalarGrid.get(0, -1)).toBeNaN();
        });

        it("should return NaN for NaN values", () => {
            const sparseData = new Float32Array(9);
            sparseData[0] = NaN; // 0 is falsy in JS
            const sparseGrid = new GridData(0, 0, 3, 3, sparseData);
            expect(sparseGrid.get(0, 0)).toBeNaN();
        });
    });

    describe("interpolateNearest()", () => {
        it("should return exact value when point is on a node", () => {
            expect(scalarGrid.interpolateNearest(1, 1, false)).toBe(50);
        });

        it("should round to the closest neighbor", () => {
            expect(scalarGrid.interpolateNearest(1.2, 1.2, false)).toBe(50);
            expect(scalarGrid.interpolateNearest(1.6, 1.6, false)).toBe(90);
        });

        it("should return NaN when out of bounds", () => {
            expect(scalarGrid.interpolateNearest(-1, 0, false)).toBeNaN();
            expect(scalarGrid.interpolateNearest(5, 5, false)).toBeNaN();
        });

        it("should interpolate correctly periodic x", () => {
            const wrapGrid = new GridData(0, 0, 3, 3, gridData)
            expect(wrapGrid.interpolateNearest(2.4, 0, true)).toBe(30);
            expect(wrapGrid.interpolateNearest(-0.6, 0, true)).toBe(30);
            expect(wrapGrid.interpolateNearest(2.6, 0, true)).toBe(10);
            expect(wrapGrid.interpolateNearest(-0.4, 0, true)).toBe(10);
        });
    });

    describe("interpolateBilinear()", () => {

        it("should interpolate correctly in the center of a quad", () => {
            expect(scalarGrid.interpolateBilinear(0.5, 0.5, false)).toBe(30);
        });

        it("should return NaN if any corner is NaN", () => {
            const nanData = new Float32Array([10, NaN, 40, 50, 0, 0, 0, 0, 0]);
            const nanGrid = new GridData(0, 0, 3, 3, nanData);
            expect(nanGrid.interpolateBilinear(0.5, 0.5, false)).toBeNaN();
        });

        it("should interpolate correctly for periodic x", () => {
            expect(scalarGrid.interpolateBilinear(2.0, 0, true)).toBe(30);
            expect(scalarGrid.interpolateBilinear(2.5, 0, true)).toBe(20);
            expect(scalarGrid.interpolateBilinear(-0.25, 0, true)).toBe(15);
            expect(scalarGrid.interpolateBilinear(0, 0, true)).toBe(10);
            expect(scalarGrid.interpolateBilinear(-0.5, 0, true)).toBe(20);
            expect(scalarGrid.interpolateBilinear(3, 0, true)).toBe(10);
            expect(scalarGrid.interpolateBilinear(2.25, 0, true)).toBe(25);
        });
    });
});