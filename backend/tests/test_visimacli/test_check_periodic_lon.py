from vizima.vizimacli import check_periodic_lon


def test_check_periodic_lon_standard():
    """Standard 1-degree resolution global grid (0 to 359)."""
    # 360 points at 1 degree spacing = 360 degrees
    assert check_periodic_lon(lon0=0, dlon=1.0, nlon=360) is True


def test_check_periodic_lon_dateline():
    """Global grid starting at the antimeridian (-180 to 179)."""
    assert check_periodic_lon(lon0=-180, dlon=1.0, nlon=360) is True


def test_check_periodic_lon_high_res():
    """High resolution grid (e.g., 0.25 degree)."""
    # 0.25 * 1440 = 360
    assert check_periodic_lon(lon0=0, dlon=0.25, nlon=1440) is True


def test_check_periodic_lon_regional():
    """A regional grid that does not span the whole globe."""
    # Only spans 100 degrees
    assert check_periodic_lon(lon0=0, dlon=1.0, nlon=100) is False


def test_check_periodic_lon_precision():
    """Ensure np.isclose handles floating point noise."""
    # 360 / 7 is an infinite decimal
    dlon = 360 / 7
    assert check_periodic_lon(lon0=0, dlon=dlon, nlon=7)
