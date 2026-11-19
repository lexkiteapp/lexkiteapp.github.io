# repick.py <meta/clip/who> <viseme> <frame> : replace one sprite with crops[frame] (eye review found a bad pick), update mouth.json visemes
import sys, json, numpy as np, cv2
d, v, f = sys.argv[1], sys.argv[2], int(sys.argv[3]); z = np.load(f'{d}/crops.npz'); C = z[z.files[0]]
cv2.imwrite(f'{d}/sprites/{v}.png', C[f]); m = json.load(open(f'{d}/mouth.json')); m['visemes'][v] = f; json.dump(m, open(f'{d}/mouth.json', 'w')); print(v, '->', f)
