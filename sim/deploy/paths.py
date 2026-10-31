"""Forwards to ../paths.py so there is one definition of where things live."""
import importlib.util, os
_s = importlib.util.spec_from_file_location('_sim_paths', os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'paths.py'))
_m = importlib.util.module_from_spec(_s); _s.loader.exec_module(_m)
tpath, SIM, DATA, MESHES = _m.tpath, _m.SIM, _m.DATA, _m.MESHES
