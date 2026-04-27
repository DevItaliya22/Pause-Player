# Stop play

## Shell script

Use `scripts/stop-play-after-x-min.sh` to wait for X minutes, then pause media and lock or sleep the Mac.

```bash
chmod +x scripts/stop-play-after-x-min.sh
./scripts/stop-play-after-x-min.sh <minutes> [lock|sleep]
```

Examples:

```bash
./scripts/stop-play-after-x-min.sh 45 lock
./scripts/stop-play-after-x-min.sh 30 sleep
```

Notes:

- Music keeps playing normally during the timer; it is only interrupted when the timer completes.
- The script pauses Apple Music, Spotify, and VLC directly.
- For browser tab media (Chrome/Safari/etc.), it mutes system output as a best-effort fallback before locking/sleeping.
- `caffeinate` can prevent idle sleep while the timer runs, but macOS usually still sleeps when you close the lid unless clamshell mode is active (external display + power).
