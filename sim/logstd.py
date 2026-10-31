from paths import tpath

import zipfile, io, torch, numpy as np
z=zipfile.ZipFile(tpath('runs//dock_gpu//latest.zip')); sd=torch.load(io.BytesIO(z.read('policy.pth')), map_location='cpu', weights_only=False)
ls=sd['log_std'].numpy(); print('policy noise std per joint (action units):', np.round(np.exp(ls),3).tolist())
print('=> random jitter per 60 ms step at the joints (deg):', np.round(np.degrees(np.exp(ls)*4.3*0.06),2).tolist())
