#!/bin/bash

set -ex

cd scripts
bun export-schema.ts
datamodel-codegen --input dataset-schema.json --input-file-type jsonschema --output ../backend/dataset_model.py