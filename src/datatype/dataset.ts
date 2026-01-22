 
import { z } from "zod";

const VarSchema = z.strictObject({
  level: z.array(z.string()),
  units: z.string(),
  long_name: z.string(),
  standard_name: z.string(),
  description: z.string(),
});

export const DataVarSchema = VarSchema.extend({
  name: z.string(),
});

export const VectorVarSchema = VarSchema.extend({
  uname: z.string(),
  vname: z.string(),
});

export const DatasetSchema = z.strictObject({
  lon0: z.number(),
  lat0: z.number(),
  dlon: z.number(),
  dlat: z.number(),
  nlon: z.number().int(),
  nlat: z.number().int(),
  time: z.array(z.string()),
  datavars: z.record(z.string(), DataVarSchema),
  vectors: z.record(z.string(), VectorVarSchema),
  xwrap: z.boolean(),
  islonlat: z.boolean(),
  ywrap: z.boolean(),
})
 
export type DataVar = z.infer<typeof DataVarSchema>;
export type VectorVar = z.infer<typeof VectorVarSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
