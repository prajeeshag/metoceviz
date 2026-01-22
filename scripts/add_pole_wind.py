import matplotlib.pyplot as plt
import numpy as np
import xarray as xr


def calculate_polar_winds(u_row, v_row, lons_deg):
    """
    Calculates the u/v components at a pole (+90 or -90) based on the
    closest available latitude row.

    u_row: array of u-wind at closest latitude (e.g., 89.75 or -89.75)
    v_row: array of v-wind at closest latitude
    lons_deg: array of longitudes (0 to 360)
    lat: the latitude of the pole you are calculating (90 or -90)
    """
    lons_rad = np.radians(lons_deg)

    # Determine hemisphere multiplier: 1 for North Pole, -1 for South Pole
    hemi = 1.0
    # 1. Rotate all vectors to the Prime Meridian common coordinate system
    # For South Pole, the 'v' direction and rotation sense are inverted
    u_prime = u_row * np.cos(lons_rad) - hemi * v_row * np.sin(lons_rad)
    v_prime = u_row * np.sin(lons_rad) + hemi * v_row * np.cos(lons_rad)

    # 2. Average the rotated components to find the single physical vector
    u_pole_avg = np.mean(u_prime)
    v_pole_avg = np.mean(v_prime)

    # 3. Project back to every longitude (recreating the sine wave for GRIB/NetCDF)
    u_at_pole = u_pole_avg * np.cos(lons_rad) + hemi * v_pole_avg * np.sin(lons_rad)
    v_at_pole = -hemi * u_pole_avg * np.sin(lons_rad) + v_pole_avg * np.cos(lons_rad)

    return u_at_pole, v_at_pole


def add_poles_to_da(da_u, da_v):
    lons = da_u.lon.values
    times = da_u.time.values

    # Identify the closest latitudes to the poles in your dataset
    # Usually 88.54 or 89.75 depending on resolution
    lat_max = da_u.lat.max().item()
    lat_min = da_u.lat.min().item()

    u_np_list, v_np_list = [], []
    u_sp_list, v_sp_list = [], []

    # Loop through each timestep to calculate pole values
    for t in range(len(times)):
        # North Pole calculation from the highest latitude slice
        un, vn = calculate_polar_winds(
            da_u.sel(lat=lat_max).isel(time=t).values,
            da_v.sel(lat=lat_max).isel(time=t).values,
            lons,
        )
        u_np_list.append(un)
        v_np_list.append(vn)

        # South Pole calculation from the lowest latitude slice
        us, vs = calculate_polar_winds(
            da_u.sel(lat=lat_min).isel(time=t).values,
            da_v.sel(lat=lat_min).isel(time=t).values,
            lons,
        )
        u_sp_list.append(us)
        v_sp_list.append(vs)

    # Convert lists to xarray.DataArrays with proper coordinates
    def create_pole_da(data_list, lat_val, name):
        return xr.DataArray(
            np.array(data_list), coords=[times, lons], dims=["time", "lon"], name=name
        ).expand_dims(lat=[lat_val])

    # Build the pole slices
    u_90 = create_pole_da(u_np_list, 90.0, "uwnd")
    v_90 = create_pole_da(v_np_list, 90.0, "vwnd")
    u_m90 = create_pole_da(u_sp_list, -90.0, "uwnd")
    v_m90 = create_pole_da(v_sp_list, -90.0, "vwnd")

    # Combine with original data and sort by latitude
    new_u = xr.concat([u_m90, da_u, u_90], dim="lat").sortby("lat")
    new_v = xr.concat([v_m90, da_v, v_90], dim="lat").sortby("lat")
    new_u = new_u.transpose(*da_u.dims)
    new_v = new_v.transpose(*da_v.dims)
    new_u.lat.attrs = da_u.lat.attrs
    new_u.lon.attrs = da_u.lon.attrs
    new_v.lat.attrs = da_u.lat.attrs
    new_v.lon.attrs = da_u.lon.attrs
    new_u.attrs = da_u.attrs
    new_v.attrs = da_v.attrs
    return new_u, new_v


uwnd = xr.open_dataset("uwnd.10m.mon.ltm.1991-2020.nc")["uwnd"].squeeze()
vwnd = xr.open_dataset("vwnd.10m.mon.ltm.1991-2020.nc")["vwnd"].squeeze()

# Apply to your data
uwnd_extrapolated, vwnd_extrapolated = add_poles_to_da(uwnd, vwnd)

lons = uwnd.lon

print(uwnd_extrapolated)

uwnd_n = uwnd_extrapolated[1, 1, :]
vwnd_n = vwnd_extrapolated[1, 1, :]
u_npole = uwnd_extrapolated[1, 0, :]
v_npole = vwnd_extrapolated[1, 0, :]

uwnd_s = uwnd_extrapolated[1, -2, :]
vwnd_s = vwnd_extrapolated[1, -2, :]
u_spole = uwnd_extrapolated[1, -1, :]
v_spole = vwnd_extrapolated[1, -1, :]

u_data = {
    "U near N pole": uwnd_n,
    "U at N pole": u_npole,
    "U near S pole": uwnd_s,
    "U at S pole": u_spole,
}
v_data = {
    "V near N pole": vwnd_n,
    "V at N pole": v_npole,
    "V near S pole": vwnd_s,
    "V at S pole": v_spole,
}

fig, axes = plt.subplots(len(u_data), 2, figsize=(12, 8), sharex=True)

for i, ((name1, data1), (name2, data2)) in enumerate(
    zip(u_data.items(), v_data.items())
):
    axes[i, 0].plot(lons, data1, lw=1)
    axes[i, 0].set_ylabel(f"{data1.lat.values}")
    axes[i, 1].plot(lons, data2, lw=1)
    axes[i, 1].set_ylabel(f"{data2.lat.values}")

plt.tight_layout()
plt.savefig("wind_poles.png")

# write extrapolated winds to a single netcdf data
uwnd_extrapolated.to_netcdf("uwnd_pole_extrapolated.nc")
vwnd_extrapolated.to_netcdf("vwnd_pole_extrapolated.nc")
