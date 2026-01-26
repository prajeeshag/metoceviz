
import { z } from "zod";


const lon = z.number().min(-180).max(360)
const lat = z.number().min(-90).max(90)

const ProjectionBaseSchema = z.strictObject({
  startLon: lon,
  startLat: lat,
})

const FixedProjectionSchema = ProjectionBaseSchema.extend({
  cenLon: lon,
  cenLat: lat,
  endLon: lon,
  endLat: lat,
})

const LonLatSchema = ProjectionBaseSchema.extend({
  name: z.literal("LonLat"),
  dlon: lon,
  dlat: lat,
  xwrap: z.boolean(),
}).meta({ title: "LonLat" })

const EquirectangularSchema = FixedProjectionSchema.extend({
  name: z.literal("Equirectangular"),
  poleLon: lon,
  poleLat: lat,
}).meta({ title: "Equirectangular" })

const ConicConformalSchema = FixedProjectionSchema.extend({
  name: z.literal("ConicConformal"),
  standLon: lon,
  trueLat1: lat,
  trueLat2: lat,
}).meta({ title: "ConicConformal" })

const StereographicSchema = FixedProjectionSchema.extend({
  name: z.literal("Stereographic"),
  standLon: lon,
}).meta({ title: "Stereographic" })

const MercatorSchema = FixedProjectionSchema.extend({
  name: z.literal("Mercator"),
}).meta({ title: "Mercator" })

const VarSchema = z.strictObject({
  units: z.string(),
  long_name: z.string(),
  standard_name: z.string(),
  description: z.string(),
  level: z.string(),
});

export const DataVarSchema = VarSchema.extend({
  name: z.string(),
}).meta({ title: "DataVar" });

export const VectorVarSchema = VarSchema.extend({
  uname: z.string(),
  vname: z.string(),
}).meta({ title: "VectorVar" });

export const DatasetSchema = z.strictObject({
  nx: z.number().int(),
  ny: z.number().int(),
  time: z.array(z.string()),
  levels: z.record(z.string(), z.array(z.string())),
  datavars: z.record(z.string(), DataVarSchema),
  vectors: z.record(z.string(), VectorVarSchema),
  projection: z.discriminatedUnion(
    "name", [
    LonLatSchema,
    MercatorSchema,
    StereographicSchema,
    EquirectangularSchema,
    ConicConformalSchema
  ])
}).meta({ title: "Dataset" })

export type DataVar = z.infer<typeof DataVarSchema>;
export type VectorVar = z.infer<typeof VectorVarSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
