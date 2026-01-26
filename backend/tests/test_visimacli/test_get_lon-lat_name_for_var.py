import numpy as np
import xarray as xr
from vizima.vizimacli import get_lat_name_for_var, get_lon_name_for_var


def test_1d_standard_name():
    """Test standard 1D 'lon' naming."""
    ds = xr.Dataset(
        {"temp": (("lat", "lon"), np.random.rand(2, 3))},
        coords={
            "lat": ("lat", [0, 1], {"units": "degrees_north"}),
            "lon": ("lon", [10, 11, 12], {"units": "degrees_east"}),
        },
    )
    assert get_lon_name_for_var(ds.temp) == "lon"
    assert get_lat_name_for_var(ds.temp) == "lat"


def test_1d_cf_attribute():
    """Test non-standard naming but with CF attributes."""
    ds = xr.Dataset(
        {"temp": (("y", "x_coord"), np.random.rand(2, 3))},
        coords={
            "y": ("y", [0, 1], {"units": "degrees_north"}),
            "x_coord": ("x_coord", [10, 11, 12], {"standard_name": "longitude"}),
        },
    )
    assert get_lon_name_for_var(ds.temp) == "x_coord"
    assert get_lat_name_for_var(ds.temp) == "y"


def test_2d_curvilinear_coords():
    """Test 2D longitude coordinates (common in curvilinear grids)."""
    # Create 2D lon/lat arrays
    lon_vals = np.array([[10, 11], [10, 11]])
    lat_vals = np.array([[1, 1], [2, 2]])

    ds = xr.Dataset(
        {"sea_surface_temp": (("j", "i"), np.random.rand(2, 2))},
        coords={
            "lon_2d": (("j", "i"), lon_vals, {"units": "degrees_east"}),
            "lat_2d": (("j", "i"), lat_vals, {"units": "degrees_north"}),
        },
    )
    assert get_lon_name_for_var(ds.sea_surface_temp) == "lon_2d"
    assert get_lat_name_for_var(ds.sea_surface_temp) == "lat_2d"


def test_multiple_vars_isolation():
    """Ensure it picks the lon for the specific variable, not the whole dataset."""
    ds = xr.Dataset(
        {"temp_grid_a": (("x1",), [1, 2]), "temp_grid_b": (("x2",), [3, 4])},
        coords={
            "x1": ("x1", [10, 11], {"standard_name": "longitude"}),
            "x2": ("x2", [20, 21], {"standard_name": "longitude"}),
        },
    )
    assert get_lon_name_for_var(ds.temp_grid_a) == "x1"
    assert get_lon_name_for_var(ds.temp_grid_b) == "x2"
    assert get_lat_name_for_var(ds.temp_grid_a) == ""
    assert get_lat_name_for_var(ds.temp_grid_b) == ""


def test_no_lon_found():
    """Ensure it raises ValueError when no longitude is present."""
    ds = xr.Dataset({"data": (("dim0",), [1, 2, 3])})
    assert get_lon_name_for_var(ds.data) == ""
    assert get_lat_name_for_var(ds.data) == ""
