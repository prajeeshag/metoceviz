from unittest.mock import patch

import pandas as pd
import xarray as xr
from vizima.vizimacli import handle_times


def test_handle_times_with_real_cf_accessor():
    ds = xr.Dataset(
        data_vars={"temp": (["time"], [10.1, 12.2])},
        coords={
            "time": (["time"], pd.date_range("2026-01-01", periods=2)),
            "forecast_time": (["forecast_time"], [pd.Timestamp("2026-01-05")]),
            "reference_time": 42,  # Scalar coordinate (ndim=0)
        },
    )

    ds.time.attrs["standard_name"] = "time"
    ds.forecast_time.attrs["standard_name"] = "time"
    ds.reference_time.attrs["standard_name"] = "time"

    with patch("vizima.vizimacli.format_to_iso", side_effect=lambda t: t):
        result = handle_times(ds)

    assert "time" in result
    assert "forecast_time" in result

    assert "reference_time" not in result

    assert len(result["time"]) == 2
    assert result["forecast_time"] == [pd.Timestamp("2026-01-05")]


def test_handle_times_no_cf_match():
    ds = xr.Dataset(coords={"lat": [10, 20]})

    result = handle_times(ds)
    assert result == {}
