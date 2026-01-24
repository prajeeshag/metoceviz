#!/bin/bash
set -ex

cd ../frontend/scripts
bun export-schema.ts
datamodel-codegen --input dataset-schema.json \
--input-file-type jsonschema \
--output ../../backend/vizima/dataset_model.py \
--formatters ruff-format ruff-check

echo "✅ backend/vizima/dataset_model.py has been generated"