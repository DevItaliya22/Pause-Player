import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  closeMainWindow,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { useCallback, useEffect, useState } from "react";

type FormValues = { hours: string; minutes: string; seconds: string };

type RunningTimer = { pid: string; command: string };

const execFileAsync = promisify(execFile);

const RECENTS_KEY = "stop-play:recents";
const MAX_RECENTS = 5;
const MARKER = "STOP_PLAY_TIMER=1";

function timerShell(seconds: number): string {
  return `
${MARKER};
sudo pmset -a disablesleep 1;
caffeinate -dimsu -t ${seconds};
sudo pmset -a disablesleep 0;
pmset sleepnow;
`;
}

function startDetached(seconds: number): void {
  spawn("zsh", ["-lc", timerShell(seconds)], { detached: true, stdio: "ignore" }).unref();
}

async function successToast(seconds: number): Promise<void> {
  await showToast({
    style: Toast.Style.Success,
    title: `Timer started for ${seconds} sec`,
    message: 'Will run: shortcuts run "PausePlayer" + pmset displaysleepnow',
  });
}

async function loadRecents(): Promise<number[]> {
  const raw = await LocalStorage.getItem(RECENTS_KEY);
  if (typeof raw !== "string" || !raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => Number(x))
      .filter((n) => Number.isInteger(n) && n > 0)
      .slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

async function saveRecents(next: number[]): Promise<void> {
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(next.slice(0, MAX_RECENTS)));
}

async function bumpRecent(seconds: number): Promise<number[]> {
  const cur = await loadRecents();
  const next = [seconds, ...cur.filter((s) => s !== seconds)].slice(0, MAX_RECENTS);
  await saveRecents(next);
  return next;
}

async function runningTimers(): Promise<RunningTimer[]> {
  const { stdout } = await execFileAsync("ps", ["-axww", "-o", "pid=,command="]);
  const out: RunningTimer[] = [];
  for (const line of stdout.split("\n")) {
    const row = line.trim();
    if (!row.includes(MARKER)) continue;
    const m = row.match(/^(\d+)\s+(.+)$/);
    if (m) out.push({ pid: m[1], command: m[2] });
  }
  return out;
}

function suggestionTitle(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (!h && !m) return sec === 1 ? "Start 1 sec" : `Start ${sec} sec`;
  if (!h && !s) return m === 1 ? "Start 1 min" : `Start ${m} min`;
  if (!m && !s) return h === 1 ? "Start 1 hr" : `Start ${h} hr`;
  const p: string[] = [];
  if (h) p.push(`${h}h`);
  if (m) p.push(`${m}m`);
  if (s) p.push(`${s}s`);
  return `Start ${p.join(" ")}`;
}

function TimerForm({ onSchedule }: { onSchedule: (seconds: number) => Promise<void> }) {
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Start Custom"
            onSubmit={async (values: FormValues) => {
              const h = Number.parseInt(values.hours || "0", 10);
              const mi = Number.parseInt(values.minutes || "0", 10);
              const s = Number.parseInt(values.seconds || "0", 10);
              if ([h, mi, s].some((x) => !Number.isInteger(x) || x < 0)) {
                await showToast({ style: Toast.Style.Failure, title: "Enter valid time values" });
                return;
              }
              const total = h * 3600 + mi * 60 + s;
              if (total <= 0) {
                await showToast({ style: Toast.Style.Failure, title: "Set at least 1 second" });
                return;
              }
              await onSchedule(total);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Set duration without manual conversion." />
      <Form.TextField id="hours" title="Hours" placeholder="0" defaultValue="0" />
      <Form.TextField id="minutes" title="Minutes" placeholder="20" defaultValue="0" />
      <Form.TextField id="seconds" title="Seconds" placeholder="0" defaultValue="0" />
    </Form>
  );
}

export default function Command() {
  const { pop } = useNavigation();
  const [timers, setTimers] = useState<RunningTimer[]>([]);
  const [recents, setRecents] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const dismissForm = useCallback(() => {
    pop();
    queueMicrotask(pop);
  }, [pop]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([runningTimers(), loadRecents()]);
      setTimers(t);
      setRecents(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const scheduleFromForm = useCallback(
    async (seconds: number) => {
      setRecents(await bumpRecent(seconds));
      startDetached(seconds);
      setTimers(await runningTimers());
      dismissForm();
      await successToast(seconds);
    },
    [dismissForm],
  );

  const scheduleFromRoot = useCallback(async (seconds: number) => {
    setRecents(await bumpRecent(seconds));
    startDetached(seconds);
    await closeMainWindow();
    await successToast(seconds);
  }, []);

  const stopTimer = async (item: RunningTimer) => {
    if (!(await confirmAlert({ title: `Stop timer PID ${item.pid}?`, message: item.command }))) return;
    await execFileAsync("kill", [item.pid]);
    await showToast({ style: Toast.Style.Success, title: `Stopped timer ${item.pid}` });
    await reload();
  };

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Start or manage stop-play timers"
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={reload} />
        </ActionPanel>
      }
    >
      <List.Section title="Start Timer">
        {recents.map((sec) => {
          const title = suggestionTitle(sec);
          return (
            <List.Item
              key={sec}
              title={title}
              subtitle="Suggestion"
              actions={
                <ActionPanel>
                  <Action title={title} onAction={() => scheduleFromRoot(sec)} />
                </ActionPanel>
              }
            />
          );
        })}
        <List.Item
          title="Start Custom"
          subtitle="Hours, minutes, seconds"
          actions={
            <ActionPanel>
              <Action.Push title="Open" target={<TimerForm onSchedule={scheduleFromForm} />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Active Timers">
        {!loading && timers.length === 0 ? (
          <List.Item title="No active timers" subtitle="Start one above" />
        ) : (
          timers.map((item) => (
            <List.Item
              key={item.pid}
              title={`PID ${item.pid}`}
              subtitle={item.command}
              actions={
                <ActionPanel>
                  <Action title="Stop" icon={Icon.Stop} onAction={() => stopTimer(item)} />
                  <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={reload} />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
