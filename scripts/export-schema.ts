import { z } from "zod";
import * as fs from "fs";

import {DatasetSchema} from "../src/datatype/dataset";

function exportSchema(schema: z.ZodObject<any>, filename: string) {
  const jsonSchema = schema.toJSONSchema();
  fs.writeFileSync(filename, JSON.stringify(jsonSchema, null, 2));
  console.log(`✅ ${filename} has been generated`);
}

exportSchema(DatasetSchema, "dataset-schema.json");