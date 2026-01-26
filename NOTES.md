# Architecture

- A vizualization is composed using different components.
- A component is an immutable object that represents a part of the visualization.
- Component can be a visual element or other things like data, interpolator, projections etc.
- A component itself can be composed of other components.

## Component

- An abstract class that represents a component.
- Components are immutable.
- Components should override toString method to make it safe and deterministic json string.
- Components properties should be immutable.
- Components properties should be either primitive types, immutable tuples, or another Component.

## Provider

- Provider is responsible for creating components.
- Provider should accept the same parameters as the component constructor and an agent.
- Provider should return a Promise of component instance.
- Provider should be able to cache the response.
- Provider is called by an Agent.
- Provider should be able to handle multiple Agents.
- Only one request per Agent should be processed at a time.
- When a new request comes in:
  - If the same request is already in progress, return the same promise.
  - If the same request in cache, return the cached response.
  - If a different request is already in progress, abort the previous request and start a new one.

## Agent

- Agent takes in request, calls Provider to create a component and returns a Promise of component instance.


## Fetch Cache
- zarr chunks are cached using server side Etag and Cache-Control headers


## Random ideas

- Dataset describes the data and its attributes:
  - Variables
  - Vector variable pairs
  - time and level information
  - short name, standard name, long name, units, descriptions
  - default settings for each variable: colormap, levels
  - default settings for the dataset: projection

- Dataset lon should be in 0 to 360 or -180 to 180 range

- for wrf lambert projection:
  ```
    const projection = d3.geoConicConformal()
        .parallels([TRUELAT1, TRUELAT2])
        .center([0, MOAD_CEN_LAT])
        .rotate([-STAND_LON, 0])
        .scale(10000);
    const stand_lon_point = projection([STAND_LON, MOAD_CEN_LAT]);
    const cen_lon_point = projection([CEN_LON, MOAD_CEN_LAT]);
    projection.translate([canvas.width / 2 + (stand_lon_point[0] - cen_lon_point[0]), canvas.height / 2 + (stand_lon_point[1] - cen_lon_point[1])]);

    const bottomLeft = projection([corner_lons[1], corner_lats[1]]);
    const topRight = projection([corner_lons[3], corner_lats[3]]);

    console.log(`bottomLeft: ${bottomLeft}`);
    console.log(`topRight: ${topRight}`);
    console.log(`width: ${topRight[0] - bottomLeft[0]}`);
    console.log(`height: ${topRight[1] - bottomLeft[1]}`);

  ```

- for wrf stereographic projection:
  ```
    const projection = d3.geoStereographic()
        .rotate([-STAND_LON, -MOAD_CEN_LAT])
        .scale(30000)
    const stand_lon_point = projection([STAND_LON, MOAD_CEN_LAT]);
    const cen_lon_point = projection([CEN_LON, MOAD_CEN_LAT]);
    projection.translate([canvas.width / 2 + (stand_lon_point[0] - cen_lon_point[0]), canvas.height / 2 + (stand_lon_point[1] - cen_lon_point[1])]);

    const bottomLeft = projection([corner_lons[1], corner_lats[1]]);
    const topRight = projection([corner_lons[3], corner_lats[3]]);

    console.log(`bottomLeft: ${bottomLeft}`);
    console.log(`topRight: ${topRight}`);
    console.log(`width: ${topRight[0] - bottomLeft[0]}`);
    console.log(`height: ${topRight[1] - bottomLeft[1]}`);
  ```

- for wrf mercator projection:
  ```
    const projection = d3.geoMercator()
        .rotate([-CEN_LON, 0])
        .center([0, MOAD_CEN_LAT])
        .translate([width / 2, height / 2])
        .scale(10000);

    const bottomLeft = projection([corner_lons[1], corner_lats[1]]);
    const topRight = projection([corner_lons[3], corner_lats[3]]);

    console.log(`bottomLeft: ${bottomLeft}`);
    console.log(`topRight: ${topRight}`);
    console.log(`width: ${topRight[0] - bottomLeft[0]}`);
    console.log(`height: ${topRight[1] - bottomLeft[1]}`);
  ```

- for wrf rotated pole latlon projection:
  ```
    const projection = d3.geoEquirectangular()
      .rotate([-attrs.POLE_LON, attrs.POLE_LAT - 90])
      .scale(3000)
    projection.translate([canvas.width / 2, canvas.height / 2]);
    const cen_lon_point = projection([attrs.CEN_LON, attrs.MOAD_CEN_LAT]);
    projection.translate([canvas.width - cen_lon_point[0], canvas.height - cen_lon_point[1]]);

    const bottomLeft = projection([corner_lons[1], corner_lats[1]]);
    const topRight = projection([corner_lons[3], corner_lats[3]]);

    console.log(`bottomLeft: ${bottomLeft}`);
    console.log(`topRight: ${topRight}`);
    console.log(`width: ${topRight[0] - bottomLeft[0]}`);
    console.log(`height: ${topRight[1] - bottomLeft[1]}`);
  ```
  STAND_LON must be equal to -POLE_LON

# Roadmap

- [ ] Flow Animator
- [ ] Vector Painter
- [ ] Contour Painter
- [ ] Image Painter
