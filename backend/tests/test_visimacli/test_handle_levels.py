from unittest.mock import MagicMock

import xarray as xr
from vizima.vizimacli import handle_levels


def test_handle_levels_success():
    """Test standard case with one or more vertical coordinates."""
    # 1. Mock the vertical coordinates (v)
    mock_v = MagicMock()
    mock_v.name = "depth"
    mock_v.attrs = {"units": "m"}
    mock_v.values = [0, 10, 20]

    # 2. Mock the dataset-like object returned by ds.cf[["vertical"]]
    # It acts like a dict/iterable of coordinates
    mock_verticals = [mock_v]

    # 3. Mock the main dataset
    mock_ds = MagicMock(spec=xr.Dataset)
    # mock_ds.cf[["vertical"]] call
    mock_ds.cf.__getitem__.return_value = mock_verticals

    result = handle_levels(mock_ds)

    assert "depth" in result
    assert result["depth"] == ["0 m", "10 m", "20 m"]


def test_handle_levels_no_verticals():
    """Test case where cf.vertical returns None or is missing."""
    mock_ds = MagicMock(spec=xr.Dataset)

    # Simulate ds.cf[["vertical"]] returning None
    mock_ds.cf.__getitem__.return_value = None

    result = handle_levels(mock_ds)

    assert result == {}


def test_handle_levels_missing_units():
    """Test behavior when units attribute is missing (should use empty string)."""
    mock_v = MagicMock()
    mock_v.name = "pressure"
    mock_v.attrs = {}  # No units
    mock_v.values = [1000, 500]

    mock_ds = MagicMock(spec=xr.Dataset)
    mock_ds.cf.__getitem__.return_value = [mock_v]

    result = handle_levels(mock_ds)

    # Should append a trailing space + empty string based on your logic: f"{level} "
    assert result["pressure"] == ["1000 ", "500 "]


def test_handle_levels_multiple_verticals():
    """Test when multiple vertical dimensions (e.g., depth and pressure) exist."""
    mock_v1 = MagicMock()
    mock_v1.name = "depth"
    mock_v1.attrs = {"units": "m"}
    mock_v1.values = [5]

    mock_v2 = MagicMock()
    mock_v2.name = "sigma"
    mock_v2.attrs = {"units": "layer"}
    mock_v2.values = [1]

    mock_ds = MagicMock(spec=xr.Dataset)
    mock_ds.cf.__getitem__.return_value = [mock_v1, mock_v2]

    result = handle_levels(mock_ds)

    assert len(result) == 2
    assert result["depth"] == ["5 m"]
    assert result["sigma"] == ["1 layer"]
