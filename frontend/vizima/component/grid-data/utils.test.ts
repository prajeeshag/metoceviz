import { expect, test, describe } from "bun:test";
import { alignLongitude } from "./utils";

describe("alignLongitude()", () => {
    test("returns same value when in same hemisphere", () => {
        expect(alignLongitude(10, 20)).toBe(20);
        expect(alignLongitude(-10, -20)).toBe(-20);
    });

    test("wraps negative longitude to positive when start is positive", () => {
        // Scenario: Moving East across the Date Line
        // Start at 170, current is -175 (which is 185 in a 0-360 view)
        expect(alignLongitude(170, -175)).toBe(185);
    });

    test("wraps longitude > 180 to negative when start is negative", () => {
        // Scenario: Moving West across the Date Line
        // Start at -170, current is 190
        expect(alignLongitude(-170, 190)).toBe(-170);
        expect(alignLongitude(-170, 20)).toBe(20);
    });

    test("handles the 0 meridian boundary correctly", () => {
        expect(alignLongitude(1, -1)).toBe(359);
        expect(alignLongitude(-1, 1)).toBe(1); // Doesn't trigger the > 180 rule
    });
});