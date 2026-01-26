import * as zarr from "https://cdn.jsdelivr.net/npm/zarrita/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


async function get_zarr(variable) {
    // Note: Ensure your local server is running at this address
    const store = new zarr.FetchStore(`http://0.0.0.0:3000/mercator.zarr/${variable}`);
    const root = await zarr.open(store, { kind: "array" });
    const arr = await zarr.get(root);
    return new Float32Array(arr.data);
}

async function render() {
    // 1. Fetch Data
    const xlat = await get_zarr("xlat");
    const xlong = await get_zarr("xlong");

    // 2. Setup Canvas
    const width = 800;
    const height = 800;

    const canvas = document.getElementById('mapCanvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    document.body.style.backgroundColor = "red";
    canvas.style.backgroundColor = "blue";

    // 3. Setup Projection
    // Added .fitSize to automatically center and scale your data to the canvas
    const projection = d3.geoMercator()
        .rotate([-80, 0])
        .center([0, 30])
        .translate([width / 2, height / 2])
        .scale(10000);

    // 4. Draw Points
    ctx.fillStyle = "white";
    ctx.beginPath();

    const fmt = d3.format("03.0f");

    for (let i = 0; i < xlat.length; i++) {
        const coords = projection([xlong[i], xlat[i]]);

        if (coords) {
            const [x, y] = coords;
            // Draw a small 1x1 pixel rect for each point
            // ctx.fillRect(x, y, 1, 1);
            ctx.fillText(fmt(i), x, y);
            console.log(i, x, y);
        }
    }

    console.log("Plotting complete. Mercator projection.");
}

render().catch(console.error);
