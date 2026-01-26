import cf_xarray  # noqa: F401
import numpy as np
import pytest
import xarray as xr
from vizima.vizimacli import get_nx


def test_get_nx_1d():
    """Test standard 1D longitude coordinate."""
    ds = xr.Dataset(coords={"lon": (["lon"], np.arange(10), {"units": "degrees_east"})})
    assert get_nx(ds) == 10


def test_get_nx_2d():
    """Test 2D curvilinear longitude (e.g., ROMS or WRF grids)."""
    # Create 2D coordinates: (y, x) -> (5, 20)
    lon_values = np.zeros((5, 20))
    ds = xr.Dataset(coords={"lon": (["y", "x"], lon_values, {"units": "degrees_east"})})
    # Should return length of dimension 1 (x), which is 20
    assert get_nx(ds) == 20


def test_get_nx_multiple_error():
    """Should raise ValueError if multiple longitudes are present."""
    ds = xr.Dataset(
        coords={
            "lon1": (["lon1"], [1, 2], {"units": "degrees_east"}),
            "lon2": (["lon2"], [1, 2], {"units": "degrees_east"}),
        }
    )
    with pytest.raises(ValueError, match="Multiple longitude coordinates found"):
        get_nx(ds)


def test_get_nx_none_found_error():
    """Should raise ValueError if no longitude is identified."""
    ds = xr.Dataset(coords={"temperature": (["x"], [25, 26])})
    with pytest.raises(ValueError, match="No longitude coordinate found"):
        get_nx(ds)


def test_get_nx_invalid_dims():
    """Should raise ValueError if longitude is 3D."""
    ds = xr.Dataset(
        coords={
            "lon": (["t", "y", "x"], np.zeros((2, 5, 5)), {"units": "degrees_east"})
        }
    )
    with pytest.raises(ValueError, match="expected 1 or 2"):
        get_nx(ds)
