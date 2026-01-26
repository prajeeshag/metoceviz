from unittest.mock import MagicMock, patch

import pytest
from vizima.vizimacli import get_time


def test_get_time_metadata_success():
    # Setup mock dataset and cf-accessor
    mock_ds = MagicMock()
    mock_time_coord = MagicMock()
    mock_time_coord.values = ["2026-01-01", "2026-01-02"]

    # Mock the ds.cf["time"] access
    mock_ds.cf.__getitem__.return_value = mock_time_coord
    mock_ds.cf.__contains__.return_value = True

    with patch(
        "vizima.vizimacli.format_to_iso", side_effect=lambda x: f"ISO-{x}"
    ) as mock_format:
        result = get_time(mock_ds)

        assert result == ["ISO-2026-01-01", "ISO-2026-01-02"]
        assert mock_format.call_count == 2


def test_get_time_metadata_missing_time():
    # Setup mock where 'time' is not in cf
    mock_ds = MagicMock()
    mock_ds.cf.__contains__.return_value = False

    result = get_time(mock_ds)

    assert result == []


def test_get_time_metadata_empty_values():
    mock_ds = MagicMock()
    mock_time_coord = MagicMock()
    # Mock an empty numpy-like array
    mock_time_coord.values.size = 0

    mock_ds.cf.__getitem__.return_value = mock_time_coord
    mock_ds.cf.__contains__.return_value = True

    result = get_time(mock_ds)

    assert result == []
