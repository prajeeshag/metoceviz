# type: ignore

from __future__ import annotations

from pydantic import BaseModel, Extra, Field, confloat, conint
from typing import Literal


class DataVar(BaseModel):
    class Config:
        extra = Extra.forbid

    units: str
    long_name: str
    standard_name: str
    description: str
    level: str
    name: str


class VectorVar(BaseModel):
    class Config:
        extra = Extra.forbid

    units: str
    long_name: str
    standard_name: str
    description: str
    level: str
    uname: str
    vname: str


class LonLat(BaseModel):
    class Config:
        extra = Extra.forbid

    name: Literal["LonLat"] = Field("LonLat", const=True)
    startLon: confloat(ge=-180.0, le=360.0)
    startLat: confloat(ge=-90.0, le=90.0)
    dlon: confloat(ge=-180.0, le=360.0)
    dlat: confloat(ge=-90.0, le=90.0)


class Mercator(BaseModel):
    class Config:
        extra = Extra.forbid

    cenLon: confloat(ge=-180.0, le=360.0)
    cenLat: confloat(ge=-90.0, le=90.0)
    startLon: confloat(ge=-180.0, le=360.0)
    endLon: confloat(ge=-180.0, le=360.0)
    startLat: confloat(ge=-90.0, le=90.0)
    endLat: confloat(ge=-90.0, le=90.0)
    name: Literal["Mercator"] = Field("Mercator", const=True)


class Stereographic(BaseModel):
    class Config:
        extra = Extra.forbid

    cenLon: confloat(ge=-180.0, le=360.0)
    cenLat: confloat(ge=-90.0, le=90.0)
    startLon: confloat(ge=-180.0, le=360.0)
    endLon: confloat(ge=-180.0, le=360.0)
    startLat: confloat(ge=-90.0, le=90.0)
    endLat: confloat(ge=-90.0, le=90.0)
    name: Literal["Stereographic"] = Field("Stereographic", const=True)
    standLon: confloat(ge=-180.0, le=360.0)


class Equirectangular(BaseModel):
    class Config:
        extra = Extra.forbid

    cenLon: confloat(ge=-180.0, le=360.0)
    cenLat: confloat(ge=-90.0, le=90.0)
    startLon: confloat(ge=-180.0, le=360.0)
    endLon: confloat(ge=-180.0, le=360.0)
    startLat: confloat(ge=-90.0, le=90.0)
    endLat: confloat(ge=-90.0, le=90.0)
    name: Literal["Equirectangular"] = Field("Equirectangular", const=True)
    poleLon: confloat(ge=-180.0, le=360.0)
    poleLat: confloat(ge=-90.0, le=90.0)


class ConicConformal(BaseModel):
    class Config:
        extra = Extra.forbid

    cenLon: confloat(ge=-180.0, le=360.0)
    cenLat: confloat(ge=-90.0, le=90.0)
    startLon: confloat(ge=-180.0, le=360.0)
    endLon: confloat(ge=-180.0, le=360.0)
    startLat: confloat(ge=-90.0, le=90.0)
    endLat: confloat(ge=-90.0, le=90.0)
    name: Literal["ConicConformal"] = Field("ConicConformal", const=True)
    standLon: confloat(ge=-180.0, le=360.0)
    trueLat1: confloat(ge=-90.0, le=90.0)
    trueLat2: confloat(ge=-90.0, le=90.0)


class Dataset(BaseModel):
    class Config:
        extra = Extra.forbid

    nx: conint(ge=-9007199254740991, le=9007199254740991)
    ny: conint(ge=-9007199254740991, le=9007199254740991)
    time: list[str]
    levels: dict[str, list[str]]
    datavars: dict[str, DataVar]
    vectors: dict[str, VectorVar]
    xwrap: bool
    islonlat: bool
    projection: LonLat | Mercator | Stereographic | Equirectangular | ConicConformal
