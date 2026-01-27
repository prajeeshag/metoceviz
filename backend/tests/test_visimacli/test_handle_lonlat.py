import typing as t
from dataclasses import dataclass

import numpy as np
import pytest
import xarray as xr
from vizima.dataset_model import LatAxis, LonAxis
from vizima.vizimacli import handle_lonlats

# --- The Tests ---


def test_handle_lonlat_1d_longitude():
    # Setup 1D Lon: [0, 10, 20] -> count 3
    ds = xr.Dataset(
        coords={
            "lon": (
                ["lon"],
                [0.0, 10.0, 20.0],
                {"axis": "X", "units": "degrees_east"},
            )
        }
    )
    # Using cf-xarray logic: we assume .cf(['longitude']) works
    # If you haven't imported cf_xarray in your module, ensure it's loaded.

    result = handle_lonlats(ds, "longitude")

    assert "lon" in result
    assert isinstance(result["lon"], LonAxis)
    assert result["lon"].start == 0.0
    assert result["lon"].end == 20.0
    assert result["lon"].count == 3


def test_handle_lonlat_2d_latitude():
    # Setup 2D Lat: Shape (5, 10) -> count should be shape[0] = 5
    lat_vals = np.zeros((5, 10))
    lat_vals[0, 0] = -90.0
    lat_vals[-1, -1] = 90.0

    ds = xr.Dataset(
        coords={"lat_2d": (["y", "x"], lat_vals, {"units": "degrees_north"})}
    )

    result = handle_lonlats(ds, "latitude")

    assert result["lat_2d"].start == -90.0
    assert result["lat_2d"].end == 90.0
    assert result["lat_2d"].count == 5  # dimind 0 for latitude


def test_handle_lonlat_no_coordinates():
    # Setup 2D Lat: Shape (5, 10) -> count should be shape[0] = 5
    lat_vals = np.zeros((5, 10))
    lat_vals[0, 0] = -90.0
    lat_vals[-1, -1] = 90.0

    ds = xr.Dataset(
        coords={"lat_2d": (["y", "x"], lat_vals, {"units": "degrees_north"})}
    )

    result = handle_lonlats(ds, "longitude")

    assert result == {}


def test_handle_lonlat_invalid_coord_name():
    ds = xr.Dataset()
    with pytest.raises(
        ValueError, match="coord_name must be 'longitude' or 'latitude'"
    ):
        handle_lonlats(ds, "altitude")  # type: ignore


def test_handle_lonlat_invalid_ndim():
    # Create 3D coordinates which should fail
    vals = np.zeros((2, 2, 2))
    ds = xr.Dataset(
        coords={"lon_3d": (["x", "y", "z"], vals, {"standard_name": "longitude"})}
    )

    with pytest.raises(ValueError, match="Dimension of longitude should be 1 or 2"):
        handle_lonlats(ds, "longitude")
