"""Export HF wav2vec2-CTC repo to ONNX fp32 + dynamic-quantised q8 (MatMul only, conv stays fp32).
Repos that already ship ONNX only (e.g. robg/speako) are used as-is. Writes OUT/meta.json {variants:{fp32?,q8?}}."""
import json, os, shutil, sys, urllib.request
from huggingface_hub import hf_hub_download, snapshot_download
repo, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
files = [s['rfilename'] for s in json.load(urllib.request.urlopen(f'https://huggingface.co/api/models/{repo}', timeout=30))['siblings']]
variants = {}
has_weights = any(f in files for f in ('pytorch_model.bin', 'model.safetensors'))
if has_weights:
    from optimum.exporters.onnx import main_export
    from onnxruntime.quantization import quantize_dynamic, QuantType
    main_export(model_name_or_path=repo, output=out + '/exp', task='automatic-speech-recognition', opset=14, device='cpu')
    shutil.move(out + '/exp/model.onnx', out + '/model_fp32.onnx')
    for f in os.listdir(out + '/exp'):  # external data, configs
        if f.endswith('.onnx_data'): shutil.move(f'{out}/exp/{f}', f'{out}/{f}')
    quantize_dynamic(out + '/model_fp32.onnx', out + '/model_q8.onnx', weight_type=QuantType.QInt8, op_types_to_quantize=['MatMul'])
    variants = {'fp32': 'model_fp32.onnx', 'q8': 'model_q8.onnx'}
else:
    for f in ('onnx/model.onnx', 'onnx/model_quantized.onnx'):
        if f in files:
            p = hf_hub_download(repo, f); k = 'fp32' if f.endswith('model.onnx') else 'q8'
            shutil.copy(p, f'{out}/model_{k}.onnx'); variants[k] = f'model_{k}.onnx'
assert variants, 'no onnx produced'
for f in ('vocab.json', 'preprocessor_config.json'):
    shutil.copy(hf_hub_download(repo, f), f'{out}/{f}')
json.dump({'repo': repo, 'variants': variants}, open(out + '/meta.json', 'w'))
print(variants)
