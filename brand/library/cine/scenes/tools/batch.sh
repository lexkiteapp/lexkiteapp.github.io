#!/bin/bash
# batch.sh f1 <sit...>   → f1 x2 per situation (Ama + Carlos locked refs)
# batch.sh rest <sit...> → f2..f5 from the approved f1 already in lexkite-media cine/scenes/<sit>/<sit>_f1.png
T="$(cd "$(dirname "$0")" && pwd)"; M=https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/cine; m=$1; shift
for s in "$@"; do
  if [ "$m" = f1 ]; then N=2 "$T/scene.sh" "$s" 1 $M/teachers/green_ama_o3_ref.png $M/teachers/green_carlos_o3_ref.png
  else for k in 2 3 4 5; do N=1 "$T/scene.sh" "$s" $k $M/scenes/$s/${s}_f1.png; done; fi
done
