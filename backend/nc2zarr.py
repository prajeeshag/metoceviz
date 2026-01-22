import xarray as xr
import cf_xarray as cf  # noqa: F401
import questionary
import numpy as np
import typer
import pandas as pd

from dataset_model import Datavars, Vectors, Model

app = typer.Typer()


def format_to_iso(val):
    """Converts various datetime types (cftime, numpy, pd) to ISO strings."""
    if isinstance(val, np.datetime64):
        return pd.Timestamp(val).isoformat()
    # Handle cftime objects
    return val.isoformat() if hasattr(val, "isoformat") else str(val)


def get_or_ask(default: any, message: str, ask_anyway: bool = False) -> str:  # type: ignore
    if ask_anyway:
        return questionary.text(message, default=default).unsafe_ask()
    return default or questionary.text(message).unsafe_ask()


def get_latlon_metadata(ds):
    lons = ds.cf["longitude"]
    lats = ds.cf["latitude"]

    metadata = {
        "lon0": float(lons.values.flat[0]),
        "lat0": float(lats.values.flat[0]),
        "dlon": float(np.diff(lons.values).mean()) if lons.size > 1 else 0.0,
        "dlat": float(np.diff(lats.values).mean()) if lats.size > 1 else 0.0,
        "nlon": int(lons.size),
        "nlat": int(lats.size),
        "islonlat": True,
        "ywrap": False,
    }
    metadata["xwrap"] = questionary.confirm("Is this a global dataset?").unsafe_ask()
    return metadata


def get_time_metadata(ds):
    return [format_to_iso(t) for t in ds.cf["time"].values]


def skip_variables(ds):
    return questionary.checkbox(
        "Select variables which you want to skip:", choices=list(ds.data_vars)
    ).unsafe_ask()


def handle_level(var: xr.DataArray, ds: xr.Dataset) -> list[str]:
    if "vertical" not in var.cf:
        return []

    allvertical = ds.cf[["vertical"]]
    vertical_found = None
    for vertical in allvertical:
        if vertical.name in var.dim:
            vertical_found = vertical
            break

    if vertical_found is None:
        return []

    if np.ndim(vertical_found.values) == 0:
        return []

    return [str(level) for level in vertical_found.values]


def handle_vectors(ds: xr.Dataset, data_vars: list[str]) -> dict[str, Vectors]:
    vectors: dict[str, Vectors] = {}
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

            level: list[str] = handle_level(var, ds)

            name: str = get_or_ask(
                f"{v1}_{v2}", f"Vector name for ({v1}, {v2}):", ask_anyway=True
            )

            long_name: str = get_or_ask(
                ds[v1].attrs.get("long_name", name),
                f"Long name for ({v1}, {v2}):",
                ask_anyway=True,
            )

            units: str = get_or_ask(
                ds[v1].attrs.get("units", ""),
                f"Units for ({v1}, {v2}):",
                ask_anyway=True,
            )

            standard_name: str = get_or_ask(
                ds[v1].attrs.get("standard_name", name),
                f"Standard name for ({v1}, {v2}):",
                ask_anyway=True,
            )

            description: str = get_or_ask(
                ds[v1].attrs.get("description", ""),
                f"Description for ({v1}, {v2}):",
                ask_anyway=True,
            )

            vectors[name] = Vectors(
                uname=v1,
                vname=v2,
                units=units,
                level=level,
                long_name=long_name,
                standard_name=standard_name,
                description=description,
            )
    return vectors


def handle_datavars(ds: xr.Dataset, data_vars: list[str]) -> dict[str, Datavars]:
    datavars: dict[str, Datavars] = {}
    for v in data_vars:
        name = get_or_ask(
            v, f"Want to rename {v}? (leave empty to keep original): ", ask_anyway=True
        )

        units = get_or_ask(ds[v].attrs.get("units"), f"Units for {v}:", ask_anyway=True)

        long_name = get_or_ask(
            ds[v].attrs.get("long_name"), f"Long Name for {v}:", ask_anyway=True
        )

        standard_name = get_or_ask(
            ds[v].attrs.get("standard_name"), f"Standard Name for {v}:", ask_anyway=True
        )

        description = get_or_ask(
            ds[v].attrs.get("description", ""), f"Description for {v}:", ask_anyway=True
        )

        level = handle_level(ds[v], ds)

        datavars[name] = Datavars(
            units=units,
            long_name=long_name,
            standard_name=standard_name,
            description=description,
            level=level,
            name=name or v,
        )

    return datavars


@app.command()
def export_to_zarr_cf(input_path: str, output_path: str):
    ds = xr.open_dataset(input_path)

    latlon_metadata = get_latlon_metadata(ds)
    metadata = latlon_metadata

    try:
        # Handle Time
        metadata["time"] = get_time_metadata(ds)

        # Skip variables
        skipped_vars = skip_variables(ds)
        data_vars = [str(v) for v in ds.data_vars if v not in skipped_vars]

        metadata["datavars"] = handle_datavars(ds, data_vars)
        metadata["vectors"] = handle_vectors(ds, data_vars)

        dataset = Model(**metadata)

        # 4. Attach metadata to attributes and save
        ds.attrs.update(dataset.model_dump())

        # Note: Complex dicts in attrs are stored as objects in Zarr metadata
        ds.to_zarr(output_path, mode="w")
        print(f"Successfully wrote Zarr to {output_path}")
    except KeyboardInterrupt:
        print("Conversion interrupted by user")
        exit(1)


if __name__ == "__main__":
    app()
