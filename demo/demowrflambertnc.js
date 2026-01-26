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
    const width = 800;
    const height = 800;

    const canvas = document.getElementById('mapCanvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    document.body.style.backgroundColor = "red";
    canvas.style.backgroundColor = "blue";

    // 3. Setup Projection

    const projection = d3.geoConicConformal()
        .parallels([attrs.TRUELAT1, attrs.TRUELAT2])
        .center([0, attrs.MOAD_CEN_LAT])
        .rotate([-attrs.STAND_LON, 0])
        .scale(10000);
    const stand_lon_point = projection([attrs.STAND_LON, attrs.MOAD_CEN_LAT]);
    const cen_lon_point = projection([attrs.CEN_LON, attrs.MOAD_CEN_LAT]);
    projection.translate([canvas.width / 2 + (stand_lon_point[0] - cen_lon_point[0]), canvas.height / 2 + (stand_lon_point[1] - cen_lon_point[1])]);


    const fmt = d3.format("03.0f");
    const fmt2 = d3.format("03.2f");
    // 4. Draw Points
    ctx.fillStyle = "white";
    ctx.beginPath();

    for (let i = 0; i < xlat.length; i++) {
        const coords = projection([xlong[i], xlat[i]]);

        if (coords) {
            const [x, y] = coords;
            // Draw a small 1x1 pixel rect for each point
            // ctx.fillRect(x, y, 1, 1);
            ctx.fillText(fmt(i), x, y);
            console.log(fmt(i), fmt2(x), fmt2(y));
        }
    }

    console.log("Plotting complete.");
    console.log(attrs);
}

render().catch(console.error);
