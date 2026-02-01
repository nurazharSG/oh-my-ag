import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import pc from "picocolors";
import type { CleanupResult } from "../types/index.js";

export async function cleanup(dryRun = false, jsonMode = false): Promise<void> {
  const cwd = process.cwd();
  const resultsDir = join(cwd, ".agent", "results");
  const tmpDir = "/tmp";

  const result: CleanupResult = {
    cleaned: 0,
    skipped: 0,
    details: [],
  };

  const logAction = (msg: string) => {
    result.details.push(dryRun ? `[DRY-RUN] ${msg}` : `[CLEAN] ${msg}`);
    result.cleaned++;
  };

  const logSkip = (msg: string) => {
    result.details.push(`[SKIP] ${msg}`);
    result.skipped++;
  };

  try {
    const pidFiles = readdirSync(tmpDir).filter(
      (f) => f.startsWith("subagent-") && f.endsWith(".pid"),
    );

    for (const pidFile of pidFiles) {
      const pidPath = join(tmpDir, pidFile);
      const pidContent = readFileSync(pidPath, "utf-8").trim();

      if (!pidContent) {
        logAction(`Removing empty PID file: ${pidPath}`);
        if (!dryRun) {
          try {
            execSync(`rm -f "${pidPath}"`);
          } catch {}
        }
        continue;
      }

      const pid = parseInt(pidContent, 10);
      if (Number.isNaN(pid)) {
        logAction(`Removing invalid PID file: ${pidPath}`);
        if (!dryRun) {
          try {
            execSync(`rm -f "${pidPath}"`);
          } catch {}
        }
        continue;
      }

      try {
        execSync(`kill -0 ${pid} 2>/dev/null`);
        logAction(`Killing orphaned process PID=${pid} (from ${pidPath})`);
        if (!dryRun) {
          try {
            execSync(`kill ${pid} 2>/dev/null || true`);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
              execSync(`kill -0 ${pid} 2>/dev/null`);
              execSync(`kill -9 ${pid} 2>/dev/null || true`);
            } catch {}
            execSync(`rm -f "${pidPath}"`);
          } catch {}
        }
      } catch {
        logAction(`Removing stale PID file (process gone): ${pidPath}`);
        if (!dryRun) {
          try {
            execSync(`rm -f "${pidPath}"`);
          } catch {}
        }
      }
    }
  } catch {}

  try {
    const logFiles = readdirSync(tmpDir).filter(
      (f) => f.startsWith("subagent-") && f.endsWith(".log"),
    );

    for (const logFile of logFiles) {
      const logPath = join(tmpDir, logFile);
      const pidFile = logFile.replace(".log", ".pid");
      const pidPath = join(tmpDir, pidFile);

      if (existsSync(pidPath)) {
        try {
          const pidContent = readFileSync(pidPath, "utf-8").trim();
          const pid = parseInt(pidContent, 10);
          if (!Number.isNaN(pid)) {
            execSync(`kill -0 ${pid} 2>/dev/null`);
            logSkip(`Log file has active process: ${logPath}`);
            continue;
          }
        } catch {}
      }

      logAction(`Removing stale log file: ${logPath}`);
      if (!dryRun) {
        try {
          execSync(`rm -f "${logPath}"`);
        } catch {}
      }
    }
  } catch {}

  if (existsSync(resultsDir)) {
    try {
      const parallelDirs = readdirSync(resultsDir).filter((d) =>
        d.startsWith("parallel-"),
      );

      for (const parallelDir of parallelDirs) {
        const pidsPath = join(resultsDir, parallelDir, "pids.txt");
        if (!existsSync(pidsPath)) continue;

        const pidsContent = readFileSync(pidsPath, "utf-8");
        const lines = pidsContent.split("\n").filter((l) => l.trim());

        let hasRunning = false;
        for (const line of lines) {
          const [pidStr, agent] = line.split(":");
          const pid = parseInt(pidStr?.trim() || "", 10);
          if (Number.isNaN(pid)) continue;

          try {
            execSync(`kill -0 ${pid} 2>/dev/null`);
            hasRunning = true;
            logAction(
              `Killing orphaned parallel agent PID=${pid} (${agent?.trim() || "unknown"})`,
            );
            if (!dryRun) {
              try {
                execSync(`kill ${pid} 2>/dev/null || true`);
                execSync(`rm -f "${pidsPath}"`);
              } catch {}
            }
          } catch {}
        }

        if (!hasRunning) {
          logAction(`Removing stale PID list: ${pidsPath}`);
          if (!dryRun) {
            try {
              execSync(`rm -f "${pidsPath}"`);
            } catch {}
          }
        } else {
          if (!dryRun) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            try {
              execSync(`rm -f "${pidsPath}"`);
            } catch {}
          }
        }
      }
    } catch {}
  } else {
    logSkip(`No results directory found: ${resultsDir}`);
  }

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🧹 oh-my-ag cleanup ")));

  if (dryRun) {
    p.note(pc.yellow("Dry-run mode — no changes will be made"), "Mode");
  }

  if (result.details.length > 0) {
    const detailsTable = [
      pc.bold("Cleanup Details"),
      ...result.details.map((d) => {
        if (d.startsWith("[DRY-RUN]")) return pc.yellow(d);
        if (d.startsWith("[CLEAN]")) return pc.green(d);
        return pc.cyan(d);
      }),
    ].join("\n");

    p.note(detailsTable, "Details");
  }

  const summaryTable = [
    pc.bold("Summary"),
    `┌─────────┬────────┐`,
    `│ ${pc.bold("Action")}  │ ${pc.bold("Count")}  │`,
    `├─────────┼────────┤`,
    `│ Cleaned │ ${String(result.cleaned).padEnd(6)} │`,
    `│ Skipped │ ${String(result.skipped).padEnd(6)} │`,
    `└─────────┴────────┘`,
  ].join("\n");

  p.note(summaryTable, "Results");

  if (dryRun) {
    p.outro(pc.yellow("Run without --dry-run to apply changes"));
  } else {
    p.outro(pc.green("Cleanup complete!"));
  }
}
