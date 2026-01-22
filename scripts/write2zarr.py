from ast import Delete
import xarray as xr


def get_packing_params(da, n_bits=16):
    """Calculates optimal scale_factor and add_offset for signed packing."""
    data_min = float(da.min().values)
    data_max = float(da.max().values)

    # Range of a signed n-bit integer
    n_levels = 2**n_bits - 1

    scale_factor = (data_max - data_min) / n_levels
    # Offset is the midpoint to utilize the full signed range (-32768 to 32767)
    add_offset = (data_max + data_min) / 2

    return {"scale_factor": scale_factor, "add_offset": add_offset}


uwnd = xr.open_dataset("uwnd_latlon.nc")["uwnd"].drop_vars("level")
vwnd = xr.open_dataset("vwnd_latlon.nc")["vwnd"].drop_vars("level")
prate = xr.open_dataset("prate_latlon.nc")["prate"]
air = xr.open_dataset("air_latlon.nc")["air"].drop_vars("level")


# 1. Create your Dataset
lat0 = uwnd.lat[0].data
lon0 = uwnd.lon[0].data
dlat = (uwnd.lat[1] - uwnd.lat[0]).data
dlon = (uwnd.lon[1] - uwnd.lon[0]).data
nlat = uwnd.lat.size
nlon = uwnd.lon.size
lat1 = uwnd.lat[-1].data
lon1 = uwnd.lon[-1].data

ds_final = xr.Dataset({"uwnd": uwnd, "vwnd": vwnd, "prate": prate, "air": air})

ds_final.attrs["lat0"] = lat0
ds_final.attrs["lon0"] = lon0
ds_final.attrs["dlat"] = dlat
ds_final.attrs["dlon"] = dlon
ds_final.attrs["nlat"] = nlat
ds_final.attrs["nlon"] = nlon
ds_final.attrs["lat1"] = lat1
ds_final.attrs["lon1"] = lon1
ds_final.attrs["vectors"] = [
    {
        "name": "wind10m",
        "components": ["uwnd", "vwnd"],
        "long_name": "Wind at 10m height",
    },
]

print(
    f"lat0: {lat0}, lon0: {lon0}, dlat: {dlat}, dlon: {dlon}, nlat: {nlat}, nlon: {nlon}, lat1: {lat1}, lon1: {lon1}"
)

del ds_final["lat"]
del ds_final["lon"]

# 2. Define encoding with int16 and specific chunking
# Setting time: 1 means each time step is its own independent file/object in Zarr
encoding = {
    "uwnd": {
        "dtype": "int16",
        "_FillValue": -32767,
        "chunks": (1, ds_final.lat.size, ds_final.lon.size),
        **get_packing_params(uwnd),
    },
    "vwnd": {
        "dtype": "int16",
        "_FillValue": -32767,
        "chunks": (1, ds_final.lat.size, ds_final.lon.size),
        **get_packing_params(vwnd),
    },
    "prate": {
        "dtype": "int16",
        "_FillValue": -32767,
        "chunks": (1, ds_final.lat.size, ds_final.lon.size),
        **get_packing_params(prate),
    },
    "air": {
        "dtype": "int16",
        "_FillValue": -32767,
        "chunks": (1, ds_final.lat.size, ds_final.lon.size),
        **get_packing_params(air),
    },
}

# 3. Write to Zarr
ds_final.to_zarr("ncepv2.zarr", encoding=encoding, mode="w")

print(f"Success! Data saved with shape {ds_final.uwnd.shape}")
print("Chunking: One file per timestep (Spatial Optimization)")
