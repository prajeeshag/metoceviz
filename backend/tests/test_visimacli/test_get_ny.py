import cf_xarray  # noqa: F401
import numpy as np
import pytest
import xarray as xr
from vizima.vizimacli import get_ny


def test_get_ny_1d():
    """Test standard 1D latitude coordinate."""
    ds = xr.Dataset(
        coords={"lat": (["lat"], np.arange(10), {"units": "degrees_north"})}
    )
    assert get_ny(ds) == 10


def test_get_ny_2d():
    """Test 2D curvilinear latitude (e.g., ROMS or WRF grids)."""
    # Create 2D coordinates: (y, x) -> (5, 20)
    lat_values = np.zeros((5, 20))
    ds = xr.Dataset(
        coords={"lat": (["y", "x"], lat_values, {"units": "degrees_north"})}
    )
    assert get_ny(ds) == 5


def test_get_ny_multiple_error():
    """Should raise ValueError if multiple latitudes are present."""
    ds = xr.Dataset(
        coords={
            "lat1": (["lat1"], [1, 2], {"units": "degrees_north"}),
            "lat2": (["lat2"], [1, 2], {"units": "degrees_north"}),
        }
    )
    with pytest.raises(ValueError, match="Multiple latitude coordinates found"):
        get_ny(ds)


def test_get_ny_none_found_error():
    """Should raise ValueError if no latitude is identified."""
    ds = xr.Dataset(coords={"temperature": (["x"], [25, 26])})
    with pytest.raises(ValueError, match="No latitude coordinate found"):
        get_ny(ds)


def test_get_ny_invalid_dims():
    """Should raise ValueError if latitude is 3D."""
    ds = xr.Dataset(
        coords={
            "lat": (["t", "y", "x"], np.zeros((2, 5, 5)), {"units": "degrees_north"})
        }
    )
    with pytest.raises(ValueError, match="expected 1 or 2"):
        get_ny(ds)
