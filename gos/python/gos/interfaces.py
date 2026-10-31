"""Message, service and action types, written once in ROS's .msg / .srv / .action format, checked on publish and turned into Studio types.

    types = gos.interfaces.load()                     # the built-in ones in gos/interfaces/
    types = gos.interfaces.load('my_pkg/msg')         # or your own; ROS files work as they are
    app.topic('/joints', type='JointState').publish({...})  # wrong fields are refused, saying which
    gos interfaces ts OUT.ts                          # TypeScript interfaces for the Studio

Field types: bool, byte, char, int8..int64, uint8..uint64, float32, float64, string, time, duration, another type by name
(a package prefix like std_msgs/ is ignored), and arrays as T[] or T[N]. Constants (NAME=value) and defaults are read and skipped.
"""
import os, re

from .physics import GosError

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'interfaces')
INTS = {'byte', 'char', 'int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64'}
FLOATS = {'float32', 'float64', 'time', 'duration'}
PRIMS = INTS | FLOATS | {'bool', 'string'}
FIELD = re.compile(r'^(?P<type>[A-Za-z][\w/]*)(?P<arr>\[(?P<n>\d*)\])?\s+(?P<name>\w+)\s*(?P<rest>.*)$')


class Field:
    def __init__(self, name, type_, array, size):
        self.name, self.type, self.array, self.size = name, type_, array, size

    def __repr__(self): return f'{self.type}{"[]" if self.array else ""} {self.name}'


def parse_fields(text, where):
    fields = []
    for i, raw in enumerate(text.splitlines(), 1):
        line = raw.split('#', 1)[0].strip()
        if not line: continue
        m = FIELD.match(line)
        if not m: raise GosError(f'{where} line {i}: "{raw.strip()}" is not "type name". Example: float64[] position')
        if m['rest'].startswith('='): continue  # a constant
        t = m['type'].split('/')[-1]
        fields.append(Field(m['name'], 'time' if t == 'Time' else 'duration' if t == 'Duration' else t, bool(m['arr']), int(m['n']) if m['n'] else None))
    return fields


class Types:
    """All loaded types by name. A service X gives X_Request and X_Response; an action gives X_Goal, X_Result and X_Feedback."""

    def __init__(self): self.types = {}

    def add_file(self, path):
        name, ext = os.path.splitext(os.path.basename(path))
        text = open(path, encoding='utf-8').read()
        parts = re.split(r'^\s*---\s*$', text, flags=re.M)
        wants = {'.msg': [''], '.srv': ['_Request', '_Response'], '.action': ['_Goal', '_Result', '_Feedback']}.get(ext)
        if wants is None: return
        if len(parts) != len(wants): raise GosError(f'{path}: a {ext} file has {len(wants)} parts split by ---, this one has {len(parts)}.')
        for suffix, part in zip(wants, parts): self.types[name + suffix] = parse_fields(part, path)

    def check_names(self):
        for tname, fields in self.types.items():
            for f in fields:
                if f.type not in PRIMS and f.type not in self.types:
                    raise GosError(f'{tname}.{f.name} uses type "{f.type}", which is not loaded. Load its .msg file too.')
        return self

    def problems(self, tname, msg, path=''):
        """What is wrong with msg as a tname, as a list of plain sentences. Empty when it is right."""
        if tname not in self.types: return [f'No type "{tname}". Types: {", ".join(sorted(self.types))}.']
        if not isinstance(msg, dict): return [f'{path or tname} must be an object with fields {", ".join(f.name for f in self.types[tname])}.']
        out, fields = [], {f.name: f for f in self.types[tname]}
        out += [f'{path}{k} is not a field of {tname}. Fields: {", ".join(fields)}.' for k in msg if k not in fields]
        for f in fields.values():
            where = f'{path}{f.name}'
            if f.name not in msg: out.append(f'{where} is missing.'); continue
            v = msg[f.name]
            if f.array:
                if not isinstance(v, (list, tuple)): out.append(f'{where} must be a list.'); continue
                if f.size is not None and len(v) != f.size: out.append(f'{where} must have {f.size} items, not {len(v)}.')
                for i, x in enumerate(v): out += self._one(f.type, x, f'{where}[{i}]')
            else:
                out += self._one(f.type, v, where)
        return out

    def _one(self, t, v, where):
        if t == 'bool': ok = isinstance(v, bool)
        elif t == 'string': ok = isinstance(v, str)
        elif t in INTS: ok = isinstance(v, int) and not isinstance(v, bool)
        elif t in FLOATS: ok = isinstance(v, (int, float)) and not isinstance(v, bool)
        else: return self.problems(t, v, where + '.')
        return [] if ok else [f'{where} must be {"a number" if t in FLOATS else "a whole number" if t in INTS else "true or false" if t == "bool" else "text"}, not {v!r}.']

    def check(self, tname, msg):
        p = self.problems(tname, msg)
        if p: raise GosError(f'Not a valid {tname}: ' + ' '.join(p[:5]) + (f' (and {len(p) - 5} more)' if len(p) > 5 else ''))

    def to_ts(self):
        """TypeScript interfaces, one per type, for the Studio."""
        ts = lambda f: ('boolean' if f.type == 'bool' else 'string' if f.type == 'string' else 'number' if f.type in PRIMS else f.type) + ('[]' if f.array else '')
        out = ['// Generated by `gos interfaces ts` from the .msg/.srv/.action files. Do not edit; edit those and run it again.', '']
        for tname in sorted(self.types):
            out.append(f'export interface {tname} {{')
            out += [f'  {f.name}: {ts(f)};' for f in self.types[tname]]
            out += ['}', '']
        return '\n'.join(out)


def load(*folders):
    """The built-in types, plus every .msg, .srv and .action file in these folders."""
    t = Types()
    for folder in (HERE, *folders):
        if not os.path.isdir(folder): raise GosError(f'No folder {folder} with interface files.')
        for name in sorted(os.listdir(folder)): t.add_file(os.path.join(folder, name))
    return t.check_names()
