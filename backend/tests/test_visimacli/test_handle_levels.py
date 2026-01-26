import xarray as xr
from vizima.vizimacli import handle_levels


def test_handle_levels_success():
    ds = xr.Dataset(
        data_vars={"temperature": (("level",), [273, 280])},
        coords={"level": ("level", [1000, 500], {"units": "hPa", "positive": "up"})},
    )

    results = handle_levels(ds)

    assert "level" in results
    assert results["level"] == ["1000 hPa", "500 hPa"]


def test_handle_levels_no_vertical():
    ds = xr.Dataset(
        data_vars={"temperature": (("x",), [273])}, coords={"x": ("x", [1])}
    )

    results = handle_levels(ds)

    assert results == {}


def test_handle_levels_missing_units():
    ds = xr.Dataset(
        data_vars={"temp": (("depth",), [10, 10])},
        coords={"depth": ("depth", [5, 10], {"positive": "up"})},
    )

    results = handle_levels(ds)

    assert results["depth"] == ["5", "10"]
