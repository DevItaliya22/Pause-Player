import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { spawn } from "node:child_process";

function buildShellCommand(): string {
  return "sudo pmset -a disablesleep 0;";
}

async function resetPmsetDisableSleep() {
  const command = buildShellCommand();
  const child = spawn("zsh", ["-lc", command], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  await closeMainWindow();
  await showToast({
    style: Toast.Style.Success,
    title: "pmset disablesleep reset",
    message: "Ran: sudo pmset -a disablesleep 0",
  });
}

export default async function Command() {
  await resetPmsetDisableSleep();
}
