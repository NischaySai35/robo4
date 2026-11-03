"""A progress bar for anything GOS downloads or installs, in any terminal (cmd, PowerShell, bash, macOS, Linux).

One line that redraws itself:  Downloading TETROBOT  [##########..........]  52%  41.6/80.0 MB  6.3 MB/s  6 s left
Uses block characters where the terminal can show them, plain # where it can't; when the output goes to a file or a
pipe there is no redrawing, only a line every 10%.
"""
# REUSE-CHECKED: progress|tqdm|download bar -> nothing in gos/ draws progress (studio.install_app used a silent
# urlretrieve); no new dependency, the standard library is enough.
import sys, time


class Progress:
    def __init__(self, label, total=0, unit='MB', scale=1e6, stream=None):
        self.label, self.total, self.unit, self.scale = label, total, unit, scale
        self.out = stream or sys.stderr
        self.live = hasattr(self.out, 'isatty') and self.out.isatty()
        enc = (getattr(self.out, 'encoding', '') or '').lower()
        self.full, self.empty = ('█', '░') if 'utf' in enc else ('#', '.')
        self.t0, self.done, self.shown, self.step = time.time(), 0, 0.0, -1

    def update(self, n):
        """Add n units (bytes) done."""
        self.done += n
        now = time.time()
        if self.live and now - self.shown < 0.1 and self.done < self.total: return  # redraw at most 10 times a second
        self.shown = now
        if not self.live:
            step = int(10 * self.done / self.total) if self.total else 0
            if step == self.step: return
            self.step = step
        self.out.write(('\r' if self.live else '') + self.line() + ('' if self.live else '\n')); self.out.flush()

    def line(self):
        took = time.time() - self.t0
        speed = self.done / took if took > 0.3 else 0  # the first instant would show a silly speed
        rate = f'{speed / self.scale:.1f} {self.unit}/s' if speed else '...'
        got = f'{self.done / self.scale:.1f}'
        if not self.total:
            return f'{self.label}  {got} {self.unit}  {rate}'
        f = min(1.0, self.done / self.total)
        bar = self.full * int(f * 20) + self.empty * (20 - int(f * 20))
        left = f'{(self.total - self.done) / speed:.0f} s left' if speed else ''
        return f'{self.label}  [{bar}] {f * 100:3.0f}%  {got}/{self.total / self.scale:.1f} {self.unit}  {rate}  {left} '

    def finish(self, message=''):
        took = time.time() - self.t0
        self.out.write(('\r' if self.live else '') + f'{self.label}  done: {self.done / self.scale:.1f} {self.unit} in {took:.0f} s'.ljust(78) + (f'  {message}' if message else '') + '\n')
        self.out.flush()


def download(url, path, label='Downloading', headers=None, timeout=30):
    """Save url to path with a progress bar. Writes path + '.part' first, so a broken download never looks finished."""
    import os, urllib.request
    tmp = path + '.part'
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=timeout) as r, open(tmp, 'wb') as f:
        bar = Progress(label, int(r.headers.get('Content-Length') or 0))
        while True:
            chunk = r.read(1 << 16)
            if not chunk: break
            f.write(chunk); bar.update(len(chunk))
    os.replace(tmp, path)
    bar.finish()
    return path
