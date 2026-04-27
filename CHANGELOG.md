# Stop Play Changelog

## [Unreleased]

### Added

- Unified timer experience in `Stop Play After "X" Min` so starting and managing timers happens in one command.
- Active timer management with process listing, refresh action, and stop confirmation.
- Flexible custom duration form with separate hours, minutes, and seconds fields.

### Changed

- Custom timer now validates each time segment and computes total seconds automatically.
- Timer start now closes the Raycast window so reopening Raycast returns to the default UI.
- Command metadata updated to reflect the merged, single-command workflow.
- README now documents required `PausePlayer` Shortcut setup with a visual example.
- README cleaned up to remove old shell-script instructions and document the Raycast-only flow.
- Extension platforms narrowed to `macOS` to match runtime behavior (`shortcuts` + `pmset`).

### Removed

- Deleted standalone commands replaced by unified flow:
  - `start-20-min`
  - `list-stop-play-processes`
