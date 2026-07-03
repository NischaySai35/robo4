# Changelog

All notable changes to TETROBOT are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project aims to follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Modular connector mating** — keyed connectors (position, normal, roll, symmetry);
  Auto-Snap and manual Assembly Mate with keyed-to-nearest-90° alignment; animated
  approach → align → insert → latch with an obstacle collision guard; right-click
  **Unlock** to detach with a reverse slide-out.
- **Reusable modules** — global default module usable in any project via **Add Module**,
  **Edit Default**, and **Save as Default**.
- **Joint types (actuator profiles)** — shared motor + torque limit per named type
  (e.g. Twist / Bend); editing a type updates every joint of that type.
- **Shared Free / Rigid grounding** with **Auto-ground to CoM**, consistent across
  Editor, Analysis, and Animation.
- **Analysis overlay modes** — Motor load / Material stress / Current, with a live
  color-bar (hover values + peak pointer, overstrain past 100%), over-limit alert
  cards, and in-table joint angle editing (type / step / drag-scrub).
- **Real-time hardware Sync** — stream live model joint values to a connected ESP32
  (~20 Hz) with telemetry feedback.
- **Animation clips + groups** — multiple clips, keyframe recording per clip, and
  clip sequences (groups) with delays.
- Professional repo scaffolding: `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, issue/PR templates.

### Changed
- Analysis overlay now colors by **motor load** (not structural bending) by default.
- Constant screen-size viewport gizmos; responsive viewport toolbar; redesigned
  navigation gizmo and CVD-safe telemetry chart palette.
- Graph forward kinematics honors cross-module snap joints in Free mode too.

### Fixed
- Save-As no longer overwrites another project's library entry; duplicate library
  entries are de-duplicated by name.
- Animation clips/groups now round-trip correctly through `.nischay` save/open.
- Motor load overlay reaches full red at 100%; peak load reports true overstrain.
- Project rename inputs are reliably focusable; number fields commit on Enter.
- Save/Open dialog filter shows `*.nischay` only.

## [1.0.2] — 2026
- Rendering, cycles render, and module tooling improvements (see git history).
