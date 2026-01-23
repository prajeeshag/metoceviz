#!/bin/bash

set -ex

micromamba create -f enviornment.yml -p $(pwd)/.conda_env -y
