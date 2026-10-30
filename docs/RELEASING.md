# Releasing the desktop app

Electron makes the app and **electron-builder** packages it. GitHub Actions (`.github/workflows/release.yml`)
builds on real Windows, macOS and Ubuntu 24.04 machines, because a Mac app can only be built on macOS.

| OS | Files | Install |
|---|---|---|
| Windows | `.exe` (NSIS installer) | Run it |
| macOS | `.dmg` (install), `.zip` (auto-update), each for Intel `x64` and Apple Silicon `arm64` | Drag to Applications |
| Linux | `.deb` (Ubuntu/Debian), `.AppImage` (any distro) | `sudo apt install ./file.deb`, or `chmod +x` and run |

## New version
1. Set the same version in `package.json` and `studio/package.json`, commit, push.
2. `git tag v1.2.3` then `git push origin v1.2.3`.
3. When the Actions run is green, check the draft on the Releases page and publish it.

The tag must match `studio/package.json` or the run stops. `npm run release` from one PC only builds that PC's
OS and can split files across two releases (it did on v1.0.4), so use the tag.

## Add Mac and Linux files to an existing release
Actions tab > Release > Run workflow > `upload_to` = the tag. Empty `upload_to` = test build only.

## Not signed yet
- **macOS:** blocked on first open and no auto-update. Fix: Apple Developer account + signing and notarisation secrets.
  Until then: `xattr -cr /Applications/TETROBOT-Demo-NischaySai.app`.
- **Windows:** SmartScreen warning ("More info" > "Run anyway").
- **Ubuntu 24.04 AppImage:** needs `sudo apt install libfuse2t64`.
