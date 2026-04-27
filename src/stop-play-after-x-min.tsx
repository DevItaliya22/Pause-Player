import { Action, ActionPanel, Form, Icon, List, Toast, closeMainWindow, confirmAlert, showToast } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";

type Values = {
  hours: string;
  minutes: string;
  seconds: string;
};

type TimerProcess = {
  pid: string;
  command: string;
};

const execFileAsync = promisify(execFile);

function buildShellCommand(seconds: number): string {
  return `STOP_PLAY_TIMER=1; sleep ${seconds}; shortcuts run "PausePlayer"; pmset displaysleepnow`;
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
    title: `Timer started for ${seconds} sec`,
    message: 'Will run: shortcuts run "PausePlayer" + pmset displaysleepnow',
  });
}

async function getTimerProcesses(): Promise<TimerProcess[]> {
  const { stdout } = await execFileAsync("ps", ["-axo", "pid=,command="]);

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("STOP_PLAY_TIMER=1; sleep"))
    .map((line) => {
      const firstSpace = line.indexOf(" ");
      return {
        pid: line.slice(0, firstSpace),
        command: line.slice(firstSpace + 1),
      };
    });
}

function CustomTimerForm() {
  async function handleSubmit(values: Values) {
    const hours = Number.parseInt(values.hours || "0", 10);
    const minutes = Number.parseInt(values.minutes || "0", 10);
    const seconds = Number.parseInt(values.seconds || "0", 10);

    const hasInvalidPart = [hours, minutes, seconds].some((value) => !Number.isInteger(value) || value < 0);
    if (hasInvalidPart) {
      await showToast({ style: Toast.Style.Failure, title: "Enter valid time values" });
      return;
    }

    const totalSeconds = hours * 60 * 60 + minutes * 60 + seconds;
    if (totalSeconds <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Set at least 1 second" });
      return;
    }

    await startTimer(totalSeconds);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Custom" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Set duration without manual conversion." />
      <Form.TextField id="hours" title="Hours" placeholder="0" />
      <Form.TextField id="minutes" title="Minutes" placeholder="20" />
      <Form.TextField id="seconds" title="Seconds" placeholder="0" />
    </Form>
  );
}

export default function Command() {
  const [items, setItems] = useState<TimerProcess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setItems(await getTimerProcesses());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function stopProcess(item: TimerProcess) {
    const confirmed = await confirmAlert({
      title: `Stop timer PID ${item.pid}?`,
      message: item.command,
    });
    if (!confirmed) return;

    await execFileAsync("kill", [item.pid]);
    await showToast({ style: Toast.Style.Success, title: `Stopped timer ${item.pid}` });
    await load();
  }

  const presets = [
    { id: "20m", title: "Start 20 Min", seconds: 20 * 60 },

    { id: "15m", title: "Start 15 Min", seconds: 15 * 60 },
    { id: "10m", title: "Start 10 Min", seconds: 10 * 60 },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Start or manage stop-play timers"
      actions={
        <ActionPanel>
          <Action title="Refresh Active Timers" icon={Icon.ArrowClockwise} onAction={load} />
        </ActionPanel>
      }
    >
      <List.Section title="Start Timer">
        {presets.map((preset) => (
          <List.Item
            key={preset.id}
            title={preset.title}
            subtitle="Quick start"
            actions={
              <ActionPanel>
                <Action title={preset.title} onAction={() => startTimer(preset.seconds)} />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          title="Start Custom"
          subtitle="Set hours, minutes, and seconds"
          actions={
            <ActionPanel>
              <Action.Push title="Open Custom Timer" target={<CustomTimerForm />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Active Timers">
        {items.length === 0 && !isLoading ? (
          <List.Item title="No active timers" subtitle="Start one from the section above" />
        ) : (
          items.map((item) => (
            <List.Item
              key={item.pid}
              title={`PID ${item.pid}`}
              subtitle={item.command}
              actions={
                <ActionPanel>
                  <Action title="Stop Timer" icon={Icon.Stop} onAction={() => stopProcess(item)} />
                  <Action title="Refresh Active Timers" icon={Icon.ArrowClockwise} onAction={load} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
