# Stop Play

Raycast command to start a media-stop timer and manage active timers in one place.

## Required setup (Shortcuts)

Before using the command, create a macOS Shortcut that pauses playback:

1. Open the **Shortcuts** app.
2. Create a new shortcut named `PausePlayer`.
3. Search for **Pause** in actions.
4. Select the **Pause** action from the dropdown.
5. Save the shortcut.

![Create Pause shortcut action](assets/img.png)

The command runs:

- `shortcuts run "PausePlayer"`
- `pmset displaysleepnow`

If `PausePlayer` is missing, the timer process will not pause media correctly.

## Usage

1. Open Raycast command: `Stop Play After "X" Min`.
2. Start a preset timer or use **Start Custom** with hours/minutes/seconds.
3. Manage running timers from the **Active Timers** section (refresh or stop).

## Notes

- After starting a timer, Raycast closes automatically and returns to default UI on reopen.
- This extension is intended for macOS because it uses Shortcuts and `pmset`.
