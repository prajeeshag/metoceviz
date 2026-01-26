import typing as t

import cf_xarray as cf  # noqa: F401
import numpy as np
import pandas as pd
import questionary
import typer
import xarray as xr
from numpy.char import count
from pydantic import TypeAdapter, ValidationError

from .dataset_model import (
    ConicConformal,
    Dataset,
    DataVar,
    Equirectangular,
    LatAxis,
    LonAxis,
    LonLat,
    Mercator,
    Stereographic,
    VectorVar,
)

app = typer.Typer()

WRF_PROJ_ID_MAPPING = {
    1: "ConicConformal",
    2: "Stereographic",
    3: "Mercator",
    6: "Equirectangular",
}


def get_packing_params(da, n_bits=16):
    """Calculates optimal scale_factor and add_offset for signed packing."""
    data_min = float(da.min().values)
    data_max = float(da.max().values)

    # Range of a signed n-bit integer
    n_levels = 2**n_bits - 1

    scale_factor = (data_max - data_min) / n_levels
    # Offset is the midpoint to utilize the full signed range (-32768 to 32767)
    add_offset = (data_max + data_min) / 2

    return {"scale_factor": scale_factor, "add_offset": add_offset}


def format_to_iso(val):
    if isinstance(val, np.datetime64):
        return pd.Timestamp(val).isoformat()
    if hasattr(val, "isoformat"):
        return val.isoformat()
    if isinstance(val, str):
        # check if it is in isoformat
        try:
            return pd.Timestamp(val).isoformat()
        except ValueError:
            raise ValueError("Unsupported time type")
    raise ValueError("Unsupported time type")


def ask_text(default: any, message: str) -> str:  # type: ignore
    return questionary.text(message, default=default).unsafe_ask()


def handle_lonlat(
    ds: xr.Dataset, coord_name: t.Literal["longitude", "latitude"]
) -> dict[str, LonAxis | LatAxis]:
    match coord_name:
        case "longitude":
            AxisClass = LonAxis
            dimind = 1
        case "latitude":
            AxisClass = LatAxis
            dimind = 0
        case _:
            raise ValueError(
                f"coord_name must be 'longitude' or 'latitude'. Got {coord_name}!!"
            )

    names = ds.cf.coordinates.get(coord_name, [])

    axis = {}

    for name in names:
        coord = ds[name]
        match coord.values.ndim:
            case 1:
                axis[coord.name] = AxisClass(
                    start=coord.values[0],
                    end=coord.values[-1],
                    count=len(coord.values),
                )
            case 2:
                axis[coord.name] = AxisClass(
                    start=coord.values[0, 0],
                    end=coord.values[-1, -1],
                    count=coord.values.shape[dimind],
                )
            case _:
                raise ValueError(
                    f"Dimension of {coord_name} should be 1 or 2. Got {coord.values.ndim} for {coord.name}"
                )
    return axis


def handle_lon(ds: xr.Dataset) -> dict[str, LonAxis]:
    return handle_lonlat(ds, "longitude")  # ty:ignore[invalid-return-type]


def handle_lat(ds: xr.Dataset) -> dict[str, LatAxis]:
    return handle_lonlat(ds, "latitude")  # ty:ignore[invalid-return-type]


def check_periodic_lon(lon0, dlon, nlon):
    lon_wrap = lon0 + dlon * nlon
    return True if np.isclose(lon_wrap - lon0, 360) else False


def handle_times(ds) -> dict[str, list[str]]:
    names = ds.cf.coordinates.get("time", [])
    if not names:
        return {}
    times = {}
    for name in names:
        time = ds[name]
        if time.values.ndim == 0:
            continue
        times[time.name] = [format_to_iso(t) for t in time.values]
    return times


def skip_variables(ds):
    return (
        questionary.checkbox(
            "Select variables which you want to skip:", choices=list(ds.data_vars)
        ).unsafe_ask(),
    )


def get_lon_name_for_var(var: xr.DataArray) -> str:
    print(var)
    try:
        return var.cf["longitude"].name
    except (KeyError, AttributeError):
        return ""


def handle_level_name(var: xr.DataArray, ds: xr.Dataset) -> str:
    if "vertical" not in var.cf:
        return ""

    allvertical = ds.cf[["vertical"]]
    vertical_found = None
    for vertical in allvertical:
        if vertical.name in var.dim:
            vertical_found = vertical
            break

    if vertical_found is None:
        return ""

    return vertical_found.name


def handle_vectors(
    ds: xr.Dataset,
    data_vars: list[str],
) -> dict[str, VectorVar]:
    vectors: dict[str, VectorVar] = {}
    vec_choices = questionary.checkbox(
        "Select variables to group as Vectors (pairs):", choices=data_vars
    ).unsafe_ask()

    if not vec_choices:
        return vectors

    for i in range(0, len(vec_choices), 2):
        if i + 1 < len(vec_choices):
            v1: str = vec_choices[i]
            v2: str = vec_choices[i + 1]

            var1: xr.DataArray = ds[v1]
            var2: xr.DataArray = ds[v2]

            levelv1: str = handle_level_name(var1, ds)
            levelv2: str = handle_level_name(var2, ds)
            if levelv1 != levelv2:
                raise ValueError(f"Warning: Levels don't match for ({v1}, {v2})")

            attrs: dict[str, any] = {}  # type: ignore

            attrs["name"]: str = ask_text(
                f"{v1}_{v2}", f"Vector name for ({v1}, {v2}):"
            )
            attrs["units"]: str = ask_text(
                ds[v1].attrs.get("units", ""),
                f"Units for ({v1}, {v2}):",
            )

            attrs["standard_name"]: str = ask_text(
                ds[v1].attrs.get("standard_name", ""),
                f"Standard name for ({v1}, {v2}):",
            )

            attrs["long_name"]: str = ask_text(
                ds[v1].attrs.get("long_name", ""),
                f"Long name for ({v1}, {v2}):",
            )

            attrs["description"]: str = ask_text(
                ds[v1].attrs.get("description", ""),
                f"Description for ({v1}, {v2}):",
            )

            vectors[attrs["name"]] = VectorVar(
                uname=v1,
                vname=v2,
                level=levelv1,
                units=attrs["units"],
                long_name=attrs["long_name"],
                standard_name=attrs["standard_name"],
                description=attrs["description"],
            )
    return vectors


def handle_datavars(
    ds: xr.Dataset,
    data_vars: list[str],
) -> dict[str, DataVar]:
    datavars: dict[str, DataVar] = {}
    for v in data_vars:
        attrs: dict[str, any] = {}  # type: ignore

        attrs["name"]: str = ask_text(
            v,
            f"Want to rename {v}? (leave as is to keep original): ",
        )

        attrs["units"]: str = ask_text(ds[v].attrs.get("units"), f"Units for {v}:")

        attrs["long_name"]: str = ask_text(
            ds[v].attrs.get("long_name"), f"Long Name for {v}:"
        )

        attrs["standard_name"]: str = ask_text(
            ds[v].attrs.get("standard_name"),
            f"Standard Name for {v}:",
        )

        attrs["description"]: str = ask_text(
            ds[v].attrs.get("description", ""),
            f"Description for {v}:",
        )

        level = handle_level_name(ds[v], ds)

        datavars[attrs["name"]] = DataVar(
            units=attrs["units"],
            long_name=attrs["long_name"],
            standard_name=attrs["standard_name"],
            description=attrs["description"],
            level=level,
            name=v,
        )

    return datavars


def handle_levels(ds: xr.Dataset) -> dict[str, list[str]]:
    names = ds.cf.coordinates.get("vertical", [])
    levels: dict[str, list[str]] = {}

    for name in names:
        units = ds[name].attrs.get("units", "")
        if ds[name].values.ndim == 0:
            continue
        levels[name] = [f"{val} {units}".strip() for val in ds[name].values]

    return levels


def get_proj_name_from_ds(ds: xr.Dataset) -> str:
    """
    Get the projection name from the dataset.
    """
    proj_name = ds.attrs.get("projection", "")
    if proj_name not in PROJECTION_MAPPING:
        # WRF PROJ
        proj_id = ds.attrs.get("MAP_PROJ", -1)
        proj_name = WRF_PROJ_ID_MAPPING.get(proj_id, "")
    return proj_name


def get_cen_lon_from_ds(ds: xr.Dataset) -> float | None:
    """
    Get the center longitude from the dataset.
    """
    return ds.attrs.get("center_longitude", None)


def process_conic_conformal(ds: xr.Dataset) -> ConicConformal:
    """
    Process conic conformal projection.
    """
    truelat1 = ds.attrs.get("TRUELAT1", None)
    if truelat1 is None:
        raise ValueError("truelat1 not found in dataset attributes")

    truelat2 = ds.attrs.get("TRUELAT2", None)
    if truelat2 is None:
        raise ValueError("truelat2 not found in dataset attributes")

    cen_lon = ds.attrs.get("CEN_LON", None)
    if cen_lon is None:
        raise ValueError("cen_lon not found in dataset attributes")

    cen_lat = ds.attrs.get("CEN_LAT", None)
    if cen_lat is None:
        raise ValueError("cen_lat not found in dataset attributes")

    stand_lon = ds.attrs.get("STAND_LON", None)
    if stand_lon is None:
        raise ValueError("stand_lon not found in dataset attributes")

    corner_lats = ds.attrs.get("corner_lats", None)
    if corner_lats is None:
        raise ValueError("corner_lats not found in dataset attributes")
    start_lat: float = corner_lats[0]
    end_lat: float = corner_lats[2]

    corner_lons = ds.attrs.get("corner_lons", None)
    if corner_lons is None:
        raise ValueError("corner_lons not found in dataset attributes")
    start_lon: float = corner_lats[0]
    end_lon: float = corner_lats[2]

    return ConicConformal(
        name="ConicConformal",
        startLon=start_lon,
        startLat=start_lat,
        cenLon=cen_lon,
        cenLat=cen_lat,
        endLon=end_lon,
        endLat=end_lat,
        standLon=stand_lon,
        trueLat1=truelat1,
        trueLat2=truelat2,
    )


def process_equirectangular(ds: xr.Dataset) -> Equirectangular:
    """
    Process equirectangular projection.
    """
    raise NotImplementedError("Equirectangular projection not implemented yet")


def process_mercator(ds: xr.Dataset) -> Mercator:
    """
    Process mercator projection.
    """
    raise NotImplementedError("Mercator projection not implemented yet")


def process_stereographic(ds: xr.Dataset) -> Stereographic:
    """
    Process stereographic projection.
    """
    raise NotImplementedError("Stereographic projection not implemented yet")


PROJECTION_MAPPING = {
    "LonLat": "",
    "Mercator": process_mercator,
    "Stereographic": process_stereographic,
    "Equirectangular": process_equirectangular,
    "ConicConformal": process_conic_conformal,
}


def handle_projection(
    ds: xr.Dataset,
) -> LonLat | ConicConformal | Equirectangular | Mercator | Stereographic:
    """
    Handle projection detection and return appropriate projection object.
    """
    proj_name = get_proj_name_from_ds(ds)

    if not proj_name:
        if questionary.confirm("Is this data in regular lat-lon projection?").ask():
            proj_name = "LonLat"
    return PROJECTION_MAPPING[proj_name](ds)


@app.command()
def create_metadata(dataset_path: str, output_path: str):
    ds = xr.open_dataset(dataset_path)

    nx = get_nx(ds)
    ny = get_ny(ds)
    times = handle_times(ds)
    levels = handle_levels(ds)
    projection = handle_projection(ds)

    try:
        skipped_vars = skip_variables(ds)
        ds = ds.drop_vars(skipped_vars)
        data_vars = [str(v) for v in ds.data_vars]
        datavars = handle_datavars(ds, data_vars)
        vectors = handle_vectors(ds, data_vars)
    except KeyboardInterrupt:
        print("Conversation interrupted by user")
        exit(1)

    dataset = Dataset(
        nx=nx,
        ny=ny,
        times=times,
        levels=levels,
        projection=projection,
        datavars=datavars,
        vectors=vectors,
    )
    ds.attrs.update(dataset.model_dump())


if __name__ == "__main__":
    app()
