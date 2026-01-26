
export function alignLongitude(sourceLonStart: number, lon: number): number {
    if (lon < 0 && sourceLonStart >= 0) {
        return lon + 360;
    } else if (lon > 180 && sourceLonStart < 0) {
        return lon - 360;
    }
    return lon;
}