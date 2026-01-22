import matplotlib.pyplot as plt
import numpy as np
import xarray as xr
import typer

app = typer.Typer()


def add_poles_to_da(da_u, varname):
    lons = da_u.lon.values
    times = da_u.time.values

    # Identify the closest latitudes to the poles in your dataset
    # Usually 88.54 or 89.75 depending on resolution
    lat_max = da_u.lat.max().item()
    lat_min = da_u.lat.min().item()

    u_np_list = []
    u_sp_list = []

    # Loop through each timestep to calculate pole values
    for t in range(len(times)):
        # North Pole calculation from the highest latitude slice
        un = np.mean(da_u.sel(lat=lat_max).isel(time=t).values)
        u_np_list.append(un)

        # South Pole calculation from the lowest latitude slice
        us = np.mean(da_u.sel(lat=lat_min).isel(time=t).values)
        u_sp_list.append(us)

    # Convert lists to xarray.DataArrays with proper coordinates
    def create_pole_da(data_list, lat_val, name):
        arr = np.array(data_list)[:, np.newaxis]
        barr = np.broadcast_to(arr, (len(times), len(lons)))
        return xr.DataArray(
            barr,
            coords={"time": times, "lon": lons},
            dims=["time", "lon"],
            name=name,
        ).expand_dims(lat=[lat_val])

    # Build the pole slices
    u_90 = create_pole_da(u_np_list, 90.0, varname)
    u_m90 = create_pole_da(u_sp_list, -90.0, varname)

    # Combine with original data and sort by latitude
    new_u = xr.concat([u_m90, da_u, u_90], dim="lat").sortby("lat")
    new_u = new_u.transpose(*da_u.dims)
    new_u.lat.attrs = da_u.lat.attrs
    new_u.lon.attrs = da_u.lon.attrs
    new_u.attrs = da_u.attrs
    return new_u


@app.command()
def main(dataset: str, varname: str):
    uwnd = xr.open_dataset(dataset)[varname].squeeze()

    # Apply to your data
    uwnd_extrapolated = add_poles_to_da(uwnd, varname)

    lons = uwnd.lon

    print(uwnd_extrapolated)

    uwnd_n = uwnd_extrapolated[1, 1, :]
    u_npole = uwnd_extrapolated[1, 0, :]

    uwnd_s = uwnd_extrapolated[1, -2, :]
    u_spole = uwnd_extrapolated[1, -1, :]

    u_data = {
        f"{varname} near N pole": uwnd_n,
        f"{varname} at N pole": u_npole,
        f"{varname} near S pole": uwnd_s,
        f"{varname} at S pole": u_spole,
    }

    fig, axes = plt.subplots(len(u_data), 1, figsize=(12, 8), sharex=True)

    for i, (name1, data1) in enumerate(u_data.items()):
        axes[i].plot(lons, data1, lw=1)
        axes[i].set_ylabel(f"{data1.lat.values}")

    plt.tight_layout()
    plt.savefig(f"{varname}_poles.png")

    # write extrapolated winds to a single netcdf data
    uwnd_extrapolated.to_netcdf(f"{varname}_pole_extrapolated.nc")


if __name__ == "__main__":
    app()
