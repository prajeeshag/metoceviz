import numpy as np
import pytest
from vizima.vizimacli import handle_lonlat


def test_handle_lonlat_valid():
    """Test with a standard uniform 1D array."""
    values = np.array([10.0, 11.0, 12.0, 13.0])
    lon0, dlon, nlon = handle_lonlat(values, "longitude")

    assert lon0 == 10.0
    assert dlon == 1.0
    assert nlon == 4
    assert isinstance(dlon, float)


def test_handle_lonlat_floats_precision():
    """Test with floating point precision using np.linspace."""
    values = np.linspace(0, 1, 11)  # 0.0, 0.1, ..., 1.0
    lon0, dlon, nlon = handle_lonlat(values, "lat")

    assert lon0 == 0.0
    assert dlon == pytest.approx(0.1)
    assert nlon == 11


def test_handle_lonlat_invalid_ndim():
    """Should raise ValueError if input is 2D."""
    values = np.array([[1, 2], [3, 4]])
    with pytest.raises(ValueError, match="lon must be 1D"):
        handle_lonlat(values, "lon")


def test_handle_lonlat_non_uniform():
    """Should raise ValueError if the spacing is inconsistent."""
    values = np.array([0, 1, 3, 4])  # jump from 1 to 3
    with pytest.raises(ValueError, match="longitude must be uniform"):
        handle_lonlat(values, "longitude")


@pytest.mark.parametrize(
    "values, expected_dlon",
    [
        (np.array([100, 150, 200]), 50.0),
        (np.array([0, -0.5, -1.0]), -0.5),
    ],
)
def test_handle_lonlat_various_scales(values, expected_dlon):
    """Parameterized test for different directions and scales."""
    lon0, dlon, nlon = handle_lonlat(values, "coord")
    assert dlon == expected_dlon
