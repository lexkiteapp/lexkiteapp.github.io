"""Plan teacher shards: python plan.py SHARDS LIMIT TAG FORCE -> $GITHUB_OUTPUT matrix=[...] n=<count> (already uploaded shards are skipped)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from huggingface_hub import list_repo_files
nshards, limit, tag, force = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4] == 'true'
fs = sorted(f for f in list_repo_files('openslr/librispeech_asr', repo_type='dataset') if f.startswith('clean/train.100/') and f.endswith('.parquet'))
dev = sorted(f for f in list_repo_files('openslr/librispeech_asr', repo_type='dataset') if f.startswith('clean/validation/') and f.endswith('.parquet'))
assert fs and dev, 'no LibriSpeech parquet files found'
sh = C.shard_assets(fs, nshards)
if limit: sh = sh[:nshards]                                    # smoke: only the first `shards` shards
sh += [{'id': 'so', 'kind': 'so'}, {'id': 'dev', 'kind': 'dev', 'file': dev[0], 'part': 0, 'nparts': 1}]
C.ensure_release(tag, body='Soft targets / checkpoints for the Lexkite CPU distillation (docs/research/pron-phoneme-plan.md). Not a product release.')
have = set(C.list_assets(tag)); todo = [s for s in sh if force or C.asset_name(s['id']) not in have]
print(f'{len(sh)} shards planned, {len(todo)} to build')
with open(os.environ['GITHUB_OUTPUT'], 'a') as f: f.write(f'matrix={json.dumps(todo)}\nn={len(todo)}\n')
