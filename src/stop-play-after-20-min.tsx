import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { spawn } from "node:child_process";

const TWENTY_MINUTES_IN_SECONDS = 20 * 60;

function buildShellCommand(seconds: number): string {
  return `STOP_PLAY_TIMER=1;sudo pmset -a disablesleep 1;pmset displaysleepnow; sleep ${seconds}; shortcuts run "PausePlayer";sudo pmset -a disablesleep 0;`;
}

async function startTimer(seconds: number) {
  const command = buildShellCommand(seconds);
  const child = spawn("zsh", ["-lc", command], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await closeMainWindow();
  await showToast({
    style: Toast.Style.Success,
    title: "20-minute timer started",
    message: 'Will run: shortcuts run "PausePlayer" + pmset displaysleepnow',
  });
}

export default async function Command() {
  await startTimer(TWENTY_MINUTES_IN_SECONDS);
}
