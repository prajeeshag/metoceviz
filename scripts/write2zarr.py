import numcodecs
import xarray as xr

uwnd = xr.open_dataset("uwnd_latlon.nc")["uwnd"]
vwnd = xr.open_dataset("vwnd_latlon.nc")["vwnd"]

# 1. Create your Dataset
ds_final = xr.Dataset({
    "uwnd": uwnd,
    "vwnd": vwnd
})

lat0 = ds_final.lat[0].data
lon0 = ds_final.lon[0].data
dlat = (ds_final.lat[1] - ds_final.lat[0]).data
dlon = (ds_final.lon[1] - ds_final.lon[0]).data
nlat = ds_final.lat.size
nlon = ds_final.lon.size
lat1 = ds_final.lat[-1].data
lon1 = ds_final.lon[-1].data

print(f"lat0: {lat0}, lon0: {lon0}, dlat: {dlat}, dlon: {dlon}, nlat: {nlat}, nlon: {nlon}, lat1: {lat1}, lon1: {lon1}")

del ds_final["lat"]
del ds_final["lon"]
del ds_final["level"]

# write these as attributes
ds_final.attrs["lat0"] = lat0
ds_final.attrs["lon0"] = lon0
ds_final.attrs["dlat"] = dlat
ds_final.attrs["dlon"] = dlon
ds_final.attrs["nlat"] = nlat
ds_final.attrs["nlon"] = nlon
ds_final.attrs["lat1"] = lat1
ds_final.attrs["lon1"] = lon1

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