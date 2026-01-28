
import { z } from "zod";


const lon = z.number().min(-180).max(360)
const lat = z.number().min(-90).max(90)

const LonAxis = z.strictObject({
  corners: z.tuple([lon, lon, lon, lon]),
  count: z.number().int().positive(),
}).meta({ title: "LonAxis" })

const LatAxis = z.strictObject({
  corners: z.tuple([lat, lat, lat, lat]),
  count: z.number().int().positive(),
}).meta({ title: "LatAxis" })


const LonLatSchema = z.strictObject({
  name: z.literal("LonLat"),
}).meta({ title: "LonLat" })

const MercatorSchema = z.strictObject({
  name: z.literal("Mercator"),
}).meta({ title: "Mercator" })

const EquirectangularSchema = z.strictObject({
  name: z.literal("Equirectangular"),
  poleLon: lon,
  poleLat: lat,
}).meta({ title: "Equirectangular" })

const ConicConformalSchema = z.strictObject({
  name: z.literal("ConicConformal"),
  standLon: lon,
  trueLat1: lat,
  trueLat2: lat,
}).meta({ title: "ConicConformal" })

const StereographicSchema = z.strictObject({
  name: z.literal("Stereographic"),
  standLon: lon,
  trueLat: lat,
}).meta({ title: "Stereographic" })

const VarSchema = z.strictObject({
  units: z.string(),
  long_name: z.string(),
  standard_name: z.string(),
});

export const DataVarSchema = VarSchema.extend({
  arrName: z.string(),
  lon: z.string(),
  lat: z.string(),
  level: z.string(),
  time: z.string(),
}).meta({ title: "DataVar" });

export const VectorVarSchema = VarSchema.extend({
  uArrName: z.string(),
  vArrName: z.string(),
}).meta({ title: "VectorVar" });

const Projection = z.discriminatedUnion(
  "name", [
  LonLatSchema,
  MercatorSchema,
  StereographicSchema,
  EquirectangularSchema,
  ConicConformalSchema
]).meta({ title: "Projection" });

export const DatasetSchema = z.strictObject({
  lons: z.record(z.string(), LonAxis),
  lats: z.record(z.string(), LatAxis),
  times: z.record(z.string(), z.array(z.string())),
  levels: z.record(z.string(), z.array(z.string())),
  datavars: z.record(z.string(), DataVarSchema),
  vectors: z.record(z.string(), VectorVarSchema),
  projection: Projection,
  title: z.string().max(100),
  subtitle: z.string().max(150),
  description: z.string(),
}).meta({ title: "Dataset" })

export type DataVar = z.infer<typeof DataVarSchema>;
export type VectorVar = z.infer<typeof VectorVarSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type LonAxis = z.infer<typeof LonAxis>;
export type LatAxis = z.infer<typeof LatAxis>;
export type Projection = z.infer<typeof Projection>;