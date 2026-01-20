import numcodecs
import xarray as xr

uwnd = xr.open_dataset("uwnd_latlon.nc")["uwnd"]
vwnd = xr.open_dataset("vwnd_latlon.nc")["vwnd"]

# 1. Create your Dataset
lat0 = uwnd.lat[0].data
lon0 = uwnd.lon[0].data
dlat = (uwnd.lat[1] - uwnd.lat[0]).data
dlon = (uwnd.lon[1] - uwnd.lon[0]).data
nlat = uwnd.lat.size
nlon = uwnd.lon.size
lat1 = uwnd.lat[-1].data
lon1 = uwnd.lon[-1].data

# write these as attributes
for var in [uwnd, vwnd]:
    var.attrs["lat0"] = lat0
    var.attrs["lon0"] = lon0
    var.attrs["dlat"] = dlat
    var.attrs["dlon"] = dlon
    var.attrs["nlat"] = nlat
    var.attrs["nlon"] = nlon
    var.attrs["lat1"] = lat1
    var.attrs["lon1"] = lon1

ds_final = xr.Dataset({
    "uwnd": uwnd,
    "vwnd": vwnd
})

print(f"lat0: {lat0}, lon0: {lon0}, dlat: {dlat}, dlon: {dlon}, nlat: {nlat}, nlon: {nlon}, lat1: {lat1}, lon1: {lon1}")

del ds_final["lat"]
del ds_final["lon"]
del ds_final["level"]

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