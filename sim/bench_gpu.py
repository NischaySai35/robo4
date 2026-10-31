
import time, torch
print('cuda', torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else '')
for dev in ['cpu','cuda']:
    torch.set_num_threads(4)
    net=torch.nn.Sequential(torch.nn.Linear(54,256),torch.nn.ELU(),torch.nn.Linear(256,256),torch.nn.ELU(),torch.nn.Linear(256,128),torch.nn.ELU(),torch.nn.Linear(128,8)).to(dev)
    opt=torch.optim.Adam(net.parameters(),3e-4); x=torch.randn(3072,54,device=dev)
    for i in range(3): l=net(x).pow(2).mean(); opt.zero_grad(); l.backward(); opt.step()
    if dev=='cuda': torch.cuda.synchronize()
    t=time.time()
    for i in range(20*2): l=net(x).pow(2).mean(); opt.zero_grad(); l.backward(); opt.step()
    if dev=='cuda': torch.cuda.synchronize()
    print(dev, 'one PPO update (20 minibatches x 2 nets x 5 epochs) ~ %.1f s' % ((time.time()-t)*5))
