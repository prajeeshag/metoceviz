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

function arraysToGeoJSON(latArray, lonArray, type = "Polygon") {
    // Zip the arrays into [lon, lat] pairs
    let coordinates = latArray.map((lat, i) => [lonArray[i], lat]);

    if (type === "Polygon") {
        const first = coordinates[0];
        const last = coordinates[coordinates.length - 1];

        if (first[0] !== last[0] || first[1] !== last[1]) {
            coordinates.push([first[0], first[1]]);
        }
        // Polygons require a nested array
        coordinates = [coordinates];
    }

    return {
        type: "Feature",
        geometry: {
            type: type,
            coordinates: coordinates
        }
    };
}

function sliceArray(arr, step, start = 0) {
    const result = [];
    for (let i = start; i < arr.length; i += step) {
        result.push(arr[i]);
    }
    return result;
}


async function render() {
    // 1. Fetch Data
    const xlat = await get_zarr("xlat", "polar_noncentered");
    const xlong = await get_zarr("xlong", "polar_noncentered");
    const attrs = await get_attrs("polar_noncentered");

    // 2. Setup Canvas
    const width = 600;
    const height = 800;

    const canvas = document.getElementById('mapCanvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    document.body.style.backgroundColor = "red";
    canvas.style.backgroundColor = "black";

    const fmt = d3.format("03.0f");
    const fmt2 = d3.format("03.2f");
    // 3. Setup Projection
    // Added .fitSize to automatically center and scale your data to the canvas
    const projection = d3.geoStereographic()
        .rotate([-attrs.STAND_LON, -attrs.MOAD_CEN_LAT])
    // .rotate([-attrs.STAND_LON, -attrs.TRUELAT1])

    const points = d3.zip(attrs.corner_lons, attrs.corner_lats).slice(0, 4);
    points.push(points[0])
    projection.fitHeight(canvas.height, { type: "Polygon", coordinates: [points] });
    const [x, y] = projection(points[2]);
    const translate = projection.translate();
    projection.translate([translate[0] - (x - canvas.width) / 2, translate[1]]);
    projection.fitSize([canvas.width, canvas.height], { type: "Polygon", coordinates: [points] });

    console.log(projection.rotate());
    console.log(projection.translate());
    console.log(projection.scale());

    // const stand_lon_point = projection([attrs.STAND_LON, attrs.MOAD_CEN_LAT]);
    // const cen_lon_point = projection([attrs.CEN_LON, attrs.MOAD_CEN_LAT]);
    // projection.translate([canvas.width / 2 + (stand_lon_point[0] - cen_lon_point[0]), canvas.height / 2 + (stand_lon_point[1] - cen_lon_point[1])]);

    // 4. Draw Points
    ctx.fillStyle = "blue";
    ctx.beginPath();
    d3.geoPath(projection, ctx)({ type: "Sphere" })
    ctx.fill()

    ctx.fillStyle = "white";
    for (let i = 0; i < xlat.length; i++) {
        const coords = projection([xlong[i], xlat[i]]);

        if (coords) {
            const [x, y] = coords;
            // Draw a small 1x1 pixel rect for each point
            // ctx.fillRect(x, y, 1, 1);
            ctx.fillText(fmt(i), x, y);
            console.log(i, fmt2(x), fmt2(y));
        }
    }
    const boundary = arraysToGeoJSON(attrs.corner_lats.slice(0, 4), attrs.corner_lons.slice(0, 4), "Polygon");

    // 3. Create the path generator and LINK IT to the context
    const pathGenerator = d3.geoPath()
        .projection(projection)
        .context(ctx); // This is the key for Canvas

    // 5. Draw!
    ctx.beginPath();             // Start the path
    pathGenerator(boundary);          // The generator "commands" the context
    // ctx.fillStyle = "steelblue";
    // ctx.fill();                  // Fill the shape
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();

    const bottomLeft = projection([attrs.corner_lons[1], attrs.corner_lats[1]]);
    const topRight = projection([attrs.corner_lons[3], attrs.corner_lats[3]]);

    console.log(`bottomLeft: ${bottomLeft}`);
    console.log(`topRight: ${topRight}`);
    console.log(`width: ${topRight[0] - bottomLeft[0]}`);
    console.log(`height: ${topRight[1] - bottomLeft[1]}`);

    console.log(boundary);
    console.log(attrs)
    console.log("Plotting complete. Stereographic projection applied.");
}

render().catch(console.error);
