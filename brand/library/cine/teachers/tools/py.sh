#!/bin/bash
# cool-Mac rule: 2 OpenCV/BLAS threads, one heavy job at a time (sandbox forbids nice)
# 21/10: /tmp venv was eaten by the tmp cleaner -> persistent venv in ~/.config/lexkite/venv312 (python-build-standalone 3.12.7)
export OPENCV_FOR_THREADS_NUM=2 OMP_NUM_THREADS=2 OPENBLAS_NUM_THREADS=2
exec "$HOME/.config/lexkite/venv312/bin/python" "$@"
