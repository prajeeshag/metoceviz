import numcodecs
import xarray as xr

uwnd = xr.open_dataset("uwnd_latlon.nc")["uwnd"]
vwnd = xr.open_dataset("vwnd_latlon.nc")["vwnd"]

# 1. Create your Dataset
ds_final = xr.Dataset({
    "uwnd": uwnd,
    "vwnd": vwnd
})

# 2. Define encoding with int16 and specific chunking
# Setting time: 1 means each time step is its own independent file/object in Zarr
encoding = {
    "uwnd": {
        "dtype": "int16",
        "scale_factor": 0.01,
        "add_offset": 0.0,
        "_FillValue": -32767,
        "chunks": (1, ds_final.lat.size, ds_final.lon.size),
    },
    "vwnd": {
        "dtype": "int16",
        "scale_factor": 0.01,
        "add_offset": 0.0,
        "_FillValue": -32767,
        "chunks": (1, ds_final.lat.size, ds_final.lon.size),
    }
}

# 3. Write to Zarr
ds_final.to_zarr("ncepv2_winds.zarr", encoding=encoding, mode="w")

print(f"Success! Data saved with shape {ds_final.uwnd.shape}")
print("Chunking: One file per timestep (Spatial Optimization)")