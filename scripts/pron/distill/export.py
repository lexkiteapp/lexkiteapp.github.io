"""Stage `export`: best student weights -> ONNX opset 17 fp32 + dynamic q8 (MatMul) -> release pron-model-s-<date>; prints model_url=<base> ($GITHUB_OUTPUT).
python export.py TAG OUT_DIR [RELEASE_TAG]"""
import json, os, sys, time
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C
from student import Student, param_count


def main(tag, out, rel):
    import onnx, onnxruntime as ort
    from onnxruntime.quantization import quantize_dynamic, QuantType
    os.makedirs(out, exist_ok=True); ck = f'{out}/ckpt.pt'
    assert C.download_asset(tag, 'pron-student-ckpt.pt', ck), 'no checkpoint on release ' + tag
    d = torch.load(ck, map_location='cpu'); m = Student().eval(); m.load_state_dict(d['best'] or d['model']); os.remove(ck)
    x = torch.randn(1, 48000)
    torch.onnx.export(m, (x,), f'{out}/model_fp32.onnx', input_names=['input_values'], output_names=['logits'], opset_version=17,
                      dynamic_axes={'input_values': {0: 'batch', 1: 'samples'}, 'logits': {0: 'batch', 1: 'frames'}}, dynamo=False)
    onnx.checker.check_model(f'{out}/model_fp32.onnx')
    quantize_dynamic(f'{out}/model_fp32.onnx', f'{out}/model_q8.onnx', weight_type=QuantType.QInt8, op_types_to_quantize=['MatMul'])
    rep = {'step': d['state']['step'], 'best_dev_PER_torch': d['state']['best_per'], 'hist': d['state']['hist'], 'params_M': round(param_count(m) / 1e6, 2), 'variants': {}}
    x2 = torch.randn(1, 37000)   # different length: dynamic axes + parity vs torch
    ref = m(x2).detach().numpy()
    for k in ('fp32', 'q8'):
        s = ort.InferenceSession(f'{out}/model_{k}.onnx', providers=['CPUExecutionProvider']); y = s.run(None, {'input_values': x2.numpy()})[0]
        assert y.shape == ref.shape, (k, y.shape, ref.shape)
        t0 = time.time(); [s.run(None, {'input_values': np.random.randn(1, 16000).astype('float32')}) for _ in range(5)]
        rep['variants'][k] = {'size_mb': round(os.path.getsize(f'{out}/model_{k}.onnx') / 1048576, 1), 'max_abs_logit_diff_vs_torch': round(float(np.abs(y - ref).max()), 3),
                              'argmax_agree_vs_torch': round(float((y.argmax(-1) == ref.argmax(-1)).mean()), 3), 'ms_per_1s_audio': round((time.time() - t0) / 5 * 1000)}
        print(k, rep['variants'][k], flush=True)
    assert rep['variants']['fp32']['max_abs_logit_diff_vs_torch'] < 0.05, 'ONNX fp32 diverges from torch'
    json.dump(C.VOCAB, open(f'{out}/vocab.json', 'w'))
    json.dump({'feature_extractor_type': 'Wav2Vec2FeatureExtractor', 'feature_size': 1, 'sampling_rate': 16000, 'padding_value': 0.0, 'do_normalize': True, 'return_attention_mask': False},
              open(f'{out}/preprocessor_config.json', 'w'))
    json.dump({'repo': f'lexkite/pron-s (Conformer-CTC student distilled from wav2vec2-lv-60-espeak-cv-ft, {rep["params_M"]} M params, step {rep["step"]})',
               'variants': {'fp32': 'model_fp32.onnx', 'q8': 'model_q8.onnx'}}, open(f'{out}/meta.json', 'w'))
    json.dump(rep, open(f'{out}/train_report.json', 'w'), indent=1)
    C.ensure_release(rel, body='Pron candidate S: small Conformer-CTC student distilled on GitHub CPU runners (pron-distill.yml). Not shipped until pron-eval gates pass.')
    for f in sorted(os.listdir(out)):
        if f.endswith(('.onnx', '.json')): C.upload_asset(rel, f'{out}/{f}', f); print('uploaded', f, flush=True)
    url = f'https://github.com/{C.REPO}/releases/download/{rel}'
    print('model_url=' + url); open(os.environ.get('GITHUB_OUTPUT', os.devnull), 'a').write(f'model_url={url}\n')


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else 'pron-model-s-' + time.strftime('%Y%m%d-%H%M', time.gmtime()))
