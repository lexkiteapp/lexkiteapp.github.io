# Synthetic foley (generated here = no licence issues): soft footsteps on a wooden floor, a light ceramic cup clink. 48 kHz mono wav.
import numpy as np, wave, sys
SR = 48000; rng = np.random.default_rng(7)
def save(fn, x):
    x = np.clip(x, -1, 1); w = wave.open(fn, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes()); w.close()
def lp(x, fc):  # one-pole low-pass
    a = np.exp(-2 * np.pi * fc / SR); y = np.zeros_like(x); s = 0.0
    for i, v in enumerate(x): s = (1 - a) * v + a * s; y[i] = s
    return y
def step(gain=1.0):
    n = int(0.16 * SR); t = np.arange(n) / SR
    thud = lp(rng.standard_normal(n), 380) * np.exp(-t / 0.035) * 3.0           # heel on wood
    tap = (lp(rng.standard_normal(n), 2600) - lp(rng.standard_normal(n), 900)) * np.exp(-np.maximum(t - 0.05, 0) / 0.012) * (t > 0.05) * 0.5   # sole roll
    body = np.sin(2 * np.pi * 95 * t) * np.exp(-t / 0.05) * 0.35                  # floor resonance
    return (thud + tap + body) * gain
def footsteps(times, dur):
    x = np.zeros(int(dur * SR))
    for k, tt in enumerate(times):
        s = step(0.8 + 0.2 * rng.random()); i = int(tt * SR); x[i:i + len(s)] += s[:len(x) - i]
    return x / np.abs(x).max() * 0.25          # ~ -12 dBFS peak, sits under voices
def clink(dur=0.6):
    t = np.arange(int(dur * SR)) / SR; x = np.zeros_like(t)
    for f, a, d in ((2210, 1.0, 0.18), (3470, 0.6, 0.12), (5320, 0.35, 0.07), (7900, 0.15, 0.04)):
        x += a * np.sin(2 * np.pi * f * t * (1 + 0.0015 * rng.standard_normal())) * np.exp(-t / d)
    x += lp(rng.standard_normal(len(t)), 6000) * np.exp(-t / 0.004) * 0.6        # contact tick
    x += lp(rng.standard_normal(len(t)), 900) * np.exp(-t / 0.02) * 0.4          # saucer/counter thump
    return x / np.abs(x).max() * 0.22
def pop(dur=0.12):   # card-appear "pop": short pitch-drop sine blip + click, peak -22 dBFS (viral mode SFX, quiet under voices)
    t = np.arange(int(dur * SR)) / SR; f = 900 * np.exp(-t / 0.03) + 420
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.025) + lp(rng.standard_normal(len(t)), 5000) * np.exp(-t / 0.002) * 0.5
    return x / np.abs(x).max() * 10 ** (-22 / 20)
def whoosh(dur=0.32):   # soft cut "whoosh": band-passed noise swell, peak -26 dBFS (peaks at the cut = 0.22 s into the file)
    t = np.arange(int(dur * SR)) / SR; n = rng.standard_normal(len(t)); x = lp(n, 2400) - lp(n, 500)
    env = np.where(t < 0.22, (t / 0.22) ** 2, np.exp(-(t - 0.22) / 0.04)); x = x * env
    return x / np.abs(x).max() * 10 ** (-26 / 20)
if __name__ == '__main__':
    save('foley_steps.wav', footsteps([0.12, 0.62, 1.12, 1.6, 2.08, 2.55], 3.0)); save('foley_clink.wav', clink())
    print('ok')
