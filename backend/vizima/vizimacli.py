import json
import typing as t

import cf_xarray as cf  # noqa: F401
import numpy as np
import pandas as pd
import questionary
import typer
import xarray as xr

from .dataset_model import (
    ConicConformal,
    Dataset,
    DataVar,
    Equirectangular,
    LonLat,
    Mercator,
    Stereographic,
    VectorVar,
)

app = typer.Typer()


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


def get_or_ask(default: any, message: str) -> str:  # type: ignore
    return questionary.text(message, default=default).unsafe_ask()


def handle_lonlat(values, coord_name: str):
    if np.ndim(values) != 1:
        raise ValueError(f"{coord_name} must be 1D")

    l0 = values[0]
    dl = np.diff(values)
    nl = len(values)

    if np.allclose(dl, dl[0]):
        dl = float(dl[0])
    else:
        raise ValueError(f"{coord_name} must be uniform")

    return l0, dl, nl


def check_periodic_lon(lon0, dlon, nlon):
    lon_wrap = lon0 + dlon * nlon
    return True if np.isclose(lon_wrap - lon0, 360) else False


def get_latlon_metadata(ds, metadata: dict):
    lons = ds.cf["longitude"]
    lats = ds.cf["latitude"]

    metadata.update(
        {
            "islonlat": True,
            "ywrap": False,
        }
    )

    lon0, dlon, nlon = handle_lonlat(lons.values, "longitude")
    lat0, dlat, nlat = handle_lonlat(lats.values, "latitude")

    metadata.update(
        {
            "lon0": lon0,
            "lat0": lat0,
            "dlon": dlon,
            "dlat": dlat,
            "nlon": nlon,
            "nlat": nlat,
        }
    )
    metadata["xwrap"] = check_periodic_lon(lon0, dlon, nlon)


def get_time(ds):
    """
    Extracts time metadata from a xarray-like dataset using cf-xarray.
    Returns a list of ISO-formatted strings.
    """
    # Check if 'time' exists in the cf-index
    if "time" not in ds.cf:
        return []

    times = ds.cf["time"]

    # Ensure values exist to avoid iteration errors on empty coords
    if hasattr(times, "values") and len(times.values) > 0:
        return [format_to_iso(t) for t in times.values]

    return []


def skip_variables(ds):
    return (
        questionary.checkbox(
            "Select variables which you want to skip:", choices=list(ds.data_vars)
        ).unsafe_ask(),
    )


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
    attributes: dict[str, any],  # type: ignore
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

            var: xr.DataArray = ds[v1]

            level: str = handle_level_name(var, ds)

            attrs = attributes

            if attrs.get("name", None) is None:
                attrs["name"]: str = get_or_ask(
                    f"{v1}_{v2}", f"Vector name for ({v1}, {v2}):"
                )
            if attrs.get("units", None) is None:
                attrs["units"]: str = get_or_ask(
                    ds[v1].attrs.get("units", ""),
                    f"Units for ({v1}, {v2}):",
                )

            if attrs.get("standard_name", None) is None:
                attrs["standard_name"]: str = get_or_ask(
                    ds[v1].attrs.get("standard_name", ""),
                    f"Standard name for ({v1}, {v2}):",
                )

            if attrs.get("long_name", None) is None:
                attrs["long_name"]: str = get_or_ask(
                    ds[v1].attrs.get("long_name", ""),
                    f"Long name for ({v1}, {v2}):",
                )

            if attrs.get("description", None) is None:
                attrs["description"]: str = get_or_ask(
                    ds[v1].attrs.get("description", ""),
                    f"Description for ({v1}, {v2}):",
                )

            vectors[attrs["name"]] = VectorVar(
                uname=v1,
                vname=v2,
                level=level,
                units=attrs["units"],
                long_name=attrs["long_name"],
                standard_name=attrs["standard_name"],
                description=attrs["description"],
            )
    return vectors


def handle_datavars(
    ds: xr.Dataset,
    data_vars: list[str],
    attributes: dict[str, any],  # type: ignore
) -> dict[str, DataVar]:
    datavars: dict[str, DataVar] = {}
    for v in data_vars:
        attrs = attributes

        if attrs.get("name", None) is None:
            attrs["name"]: str = get_or_ask(
                v,
                f"Want to rename {v}? (leave as is to keep original): ",
            )

        if attrs.get("units", None) is None:
            attrs["units"]: str = get_or_ask(
                ds[v].attrs.get("units"), f"Units for {v}:"
            )

        if attrs.get("long_name", None) is None:
            attrs["long_name"]: str = get_or_ask(
                ds[v].attrs.get("long_name"), f"Long Name for {v}:"
            )

        if attrs.get("standard_name", None) is None:
            attrs["standard_name"]: str = get_or_ask(
                ds[v].attrs.get("standard_name"),
                f"Standard Name for {v}:",
            )

        if attrs.get("description", None) is None:
            attrs["description"]: str = get_or_ask(
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


def handle_levels(ds: xr.Dataset):
    verticals = ds.cf[["vertical"]]
    if verticals is None:
        return {}

    levels: dict[str, list[str]] = {}
    for v in verticals:
        units = v.attrs.get("units", "")
        level_data = []
        for level in v.values:
            level_data.append(f"{level} {units}")
        levels[v.name] = level_data
    return levels


def get_nxy(ds: xr.Dataset, coord_name: t.Literal["latitude", "longitude"]) -> int:
    """
    Returns the horizontal length (nx) of the longitude coordinate
    using CF conventions.
    """

    try:
        names = ds.cf.coordinates.get(coord_name, [])
    except KeyError:
        names = []

    if not names:
        raise ValueError(
            f"No {coord_name} coordinate found in dataset via CF conventions."
        )

    if len(names) > 1:
        raise ValueError(f"Multiple {coord_name} coordinates found: {names}")

    var = ds[names[0]]

    if var.ndim == 1:
        return var.sizes[var.dims[0]]

    elif var.ndim == 2:
        if coord_name == "longitude":
            return var.sizes[var.dims[1]]
        return var.sizes[var.dims[0]]
    else:
        raise ValueError(f"{coord_name} has {var.ndim} dimensions; expected 1 or 2.")


def get_ny(ds: xr.Dataset) -> int:
    return get_nxy(ds, "latitude")


def get_nx(ds: xr.Dataset) -> int:
    return get_nxy(ds, "longitude")


@app.command()
def process_dataset(dataset_path: str, output_path: str, attr_file: str = ""):
    ds = xr.open_dataset(dataset_path)

    if attr_file:
        with open(attr_file, "r") as f:
            attributes = json.load(f)
    else:
        attributes = {}

    metadata = {}
    metadata.update(get_latlon_metadata(ds, metadata))
    metadata["time"] = get_time(ds)
    metadata["levels"] = handle_levels(ds)

    try:
        skipped_vars = skip_variables(ds)
        ds = ds.drop_vars(skipped_vars)
        data_vars = [str(v) for v in ds.data_vars]
        attributes["datavars"] = handle_datavars(
            ds, data_vars, attributes.get("datavars", {})
        )
        attributes["vectors"] = handle_vectors(
            ds, data_vars, attributes.get("vectors", {})
        )
    except KeyboardInterrupt:
        print("Conversation interrupted by user")
        exit(1)

    encoding = {}

    for var in ds.data_vars:
        encoding[var] = {
            "dtype": "int16",
            "_FillValue": -32767,
            "chunks": (1, ds.lat.size, ds.lon.size),
            **get_packing_params(ds[var]),
        }

    metadata.update(attributes)
    dataset = Dataset(
        nx=metadata["nx"],
        ny=metadata["ny"],
        time=metadata["time"],
        levels=metadata["levels"],
        datavars=metadata["datavars"],
        vectors=metadata["vectors"],
        projection=metadata["projection"],
    )
    ds.attrs.update(dataset.model_dump())

    with open(attr_file, "w") as f:
        json.dump(attributes, f)


if __name__ == "__main__":
    app()
