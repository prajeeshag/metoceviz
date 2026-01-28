import * as zarr from "https://cdn.jsdelivr.net/npm/zarrita/+esm";
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";


async function get_zarr(variable, data) {
    // Note: Ensure your local server is running at this address
    const store = new zarr.FetchStore(`http://0.0.0.0:3000/${data}.zarr/${variable}`);
    const root = await zarr.open(store, { kind: "array" });
    const arr = await zarr.get(root);
    return new Float32Array(arr.data);
}

async function get_attrs(data) {
    // Note: Ensure your local server is running at this address
    const store = new zarr.FetchStore(`http://0.0.0.0:3000/${data}.zarr`);
    const root = await zarr.open(store, { kind: "group" });
    return root.attrs;
}

async function render() {
    // 1. Fetch Data
    const xlat = await get_zarr("xlat", "lambert_noncentered");
    const xlong = await get_zarr("xlong", "lambert_noncentered");
    const attrs = await get_attrs("lambert_noncentered");



    // 2. Setup Canvas
    const width = 600;
    const height = 800;

    const canvas = document.getElementById('mapCanvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    document.body.style.backgroundColor = "red";
    canvas.style.backgroundColor = "blue";

    // 3. Setup Projection

    const points = d3.zip(attrs.corner_lons, attrs.corner_lats).slice(0, 4);
    points.push(points[0])

    const projection = d3.geoConicConformal()
        .parallels([attrs.TRUELAT1, attrs.TRUELAT2])
        .rotate([-attrs.STAND_LON, 0])
    projection.fitHeight(canvas.height, { type: "Polygon", coordinates: [points] });
    const [x, y] = projection(points[2]);
    const translate = projection.translate();
    projection.translate([translate[0] - (x - canvas.width) / 2, translate[1]]);

    console.log(projection.rotate());
    console.log(projection.translate());
    console.log(projection.scale());




    const fmt = d3.format("03.0f");
    const fmt2 = d3.format("03.2f");
    // 4. Draw Points
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    const path = d3.geoPath(projection, ctx);
    path({ type: "Polygon", coordinates: [points] });
    ctx.stroke();

    // for (let i = 0; i < xlat.length; i++) {
    //     const coords = projection([xlong[i], xlat[i]]);

    //     if (coords) {
    //         const [x, y] = coords;
    //         // Draw a small 1x1 pixel rect for each point
    //         // ctx.fillRect(x, y, 1, 1);
    //         ctx.fillText(fmt(i), x, y);
    //         console.log(fmt(i), fmt2(x), fmt2(y));
    //     }
    // }

    console.log("Plotting complete.");
    console.log(attrs);
}

render().catch(console.error);
