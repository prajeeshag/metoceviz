import xarray as xr


def write_zarr(dataset_path: str, output_path: str):
    ds = xr.open_dataset(dataset_path)
    xlat = ds["XLAT_M"].squeeze()
    xlong = ds["XLONG_M"].squeeze()
    new_ds = xr.Dataset({"xlat": xlat, "xlong": xlong})
    new_ds.attrs = ds.attrs
    new_ds.to_zarr(output_path)


if __name__ == "__main__":
    # write_zarr("lambert.nc", "lambert.zarr")
    # write_zarr("mercator.nc", "mercator.zarr")
    # write_zarr("polar_stereo.nc", "polar.zarr")
    # write_zarr("lambert_noncentered.nc", "lambert_noncentered.zarr")
    # write_zarr("polar_stereo_noncentered.nc", "polar_noncentered.zarr")
    write_zarr("lonlatrot.nc", "lonlatrot.zarr")
