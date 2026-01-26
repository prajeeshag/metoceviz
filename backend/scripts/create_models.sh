#!/bin/bash
set -ex

cd ../frontend/scripts
bun export-schema.ts

cd - # because its where pyproject.toml 

uv run datamodel-codegen --input ../frontend/scripts/dataset-schema.json \
--output vizima/dataset_model.py 
# --custom-file-header "# type: ignore" \

echo "✅ backend/vizima/dataset_model.py has been generated"