#!/usr/bin/env bash

set -ex

uv run ty check 
uv run ruff check . 
uv run ruff format --check . 
