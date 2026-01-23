from datetime import datetime

import numpy as np
import pandas as pd
import pytest
from vizima.vizimacli import format_to_iso


def test_format_to_iso_numpy():
    """Test branch 1: np.datetime64"""
    dt = np.datetime64("2026-01-23T18:00:00")
    # pd.Timestamp(dt).isoformat() usually yields '2026-01-23T18:00:00'
    assert format_to_iso(dt) == "2026-01-23T18:00:00"


def test_format_to_iso_has_attr():
    """Test branch 2: Objects with .isoformat() method"""
    # Standard library datetime
    py_dt = datetime(2026, 1, 23, 18, 0, 0)
    assert format_to_iso(py_dt) == "2026-01-23T18:00:00"

    # Pandas Timestamp
    pd_dt = pd.Timestamp("2026-01-23T18:00:00")
    assert format_to_iso(pd_dt) == "2026-01-23T18:00:00"


def test_format_to_iso_str():
    """Test branch 2: Objects with .isoformat() method"""
    assert format_to_iso("2026-01-23T18:00:00") == "2026-01-23T18:00:00"
    assert format_to_iso("2026-01-23") == "2026-01-23T00:00:00"


def test_format_to_iso_raises_value_error():
    """Test branch 3: Unsupported types"""
    with pytest.raises(ValueError, match="Unsupported time type"):
        format_to_iso(123456789)
