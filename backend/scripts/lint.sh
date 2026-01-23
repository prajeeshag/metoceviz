#!/usr/bin/env bash

set -ex

uv run ty check xcdo
uv run ruff check xcdo tests
uv run ruff format --check xcdo tests
