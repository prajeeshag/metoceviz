#!/usr/bin/env bash

set -ex

for py in 3.12 3.13 3.14; do
    uv run --python=python${py} pytest
done
