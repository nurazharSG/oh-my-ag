#!/usr/bin/env node
import * as p from "@clack/prompts";
import pc from "picocolors";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { startDashboard } from "./dashboard";

const args = process.argv.slice(2);
if (args[0] === "dashboard") {
  startDashboard();
} else {
  main().catch(console.error);
}

const REPO = "first-fluke/oh-my-antigravity";
const GITHUB_RAW = `https://raw.githubusercontent.com/${REPO}/main/.agent/skills`;

const SKILLS = {
  domain: [
    { name: "frontend-agent", desc: "React/Next.js UI specialist" },
    { name: "backend-agent", desc: "FastAPI/SQLAlchemy API specialist" },
    { name: "mobile-agent", desc: "Flutter/Dart mobile specialist" },
  ],
  coordination: [
    { name: "pm-agent", desc: "Product manager - task decomposition" },
    { name: "qa-agent", desc: "QA - OWASP, Lighthouse, WCAG" },
    { name: "workflow-guide", desc: "Manual multi-agent orchestration" },
    { name: "orchestrator", desc: "Automated parallel CLI execution" },
  ],
  utility: [
    { name: "debug-agent", desc: "Bug fixing specialist" },
    { name: "commit", desc: "Conventional Commits helper" },
  ],
};

const PRESETS: Record<string, string[]> = {
  fullstack: ["frontend-agent", "backend-agent", "pm-agent", "qa-agent", "debug-agent", "commit"],
  frontend: ["frontend-agent", "pm-agent", "qa-agent", "debug-agent", "commit"],
  backend: ["backend-agent", "pm-agent", "qa-agent", "debug-agent", "commit"],
  mobile: ["mobile-agent", "pm-agent", "qa-agent", "debug-agent", "commit"],
  all: [...SKILLS.domain, ...SKILLS.coordination, ...SKILLS.utility].map((s) => s.name),
};

async function fetchSkillFiles(skillName: string): Promise<string[]> {
  const files = ["SKILL.md"];
  const resourceFiles = [
    "resources/execution-protocol.md",
    "resources/tech-stack.md",
    "resources/checklist.md",
    "resources/templates.md",
    "resources/error-playbook.md",
  ];

  for (const file of resourceFiles) {
    const url = `${GITHUB_RAW}/${skillName}/${file}`;
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) files.push(file);
  }

  return files;
}

async function installSkill(skillName: string, targetDir: string): Promise<boolean> {
  const skillDir = join(targetDir, ".agent", "skills", skillName);
  const files = await fetchSkillFiles(skillName);

  for (const file of files) {
    const url = `${GITHUB_RAW}/${skillName}/${file}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const content = await res.text();
    const filePath = join(skillDir, file);
    const fileDir = dirname(filePath);

    if (!existsSync(fileDir)) {
      mkdirSync(fileDir, { recursive: true });
    }
    writeFileSync(filePath, content, "utf-8");
  }

  return true;
}

async function installShared(targetDir: string): Promise<void> {
  const sharedDir = join(targetDir, ".agent", "skills", "_shared");
  const files = [
    "reasoning-templates.md",
    "clarification-protocol.md",
    "context-loading.md",
    "skill-routing.md",
  ];

  if (!existsSync(sharedDir)) {
    mkdirSync(sharedDir, { recursive: true });
  }

  for (const file of files) {
    const url = `${GITHUB_RAW}/_shared/${file}`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const content = await res.text();
    writeFileSync(join(sharedDir, file), content, "utf-8");
  }
}

async function main() {
  console.clear();
  p.intro(pc.bgMagenta(pc.white(" 🛸 oh-my-antigravity ")));

  const projectType = await p.select({
    message: "What type of project?",
    options: [
      { value: "all", label: "✨ All", hint: "Install everything" },
      { value: "fullstack", label: "🌐 Fullstack", hint: "Frontend + Backend + PM + QA" },
      { value: "frontend", label: "🎨 Frontend", hint: "React/Next.js" },
      { value: "backend", label: "⚙️ Backend", hint: "FastAPI/Python" },
      { value: "mobile", label: "📱 Mobile", hint: "Flutter/Dart" },
      { value: "custom", label: "🔧 Custom", hint: "Choose skills" },
    ],
  });

  if (p.isCancel(projectType)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }

  let selectedSkills: string[];

  if (projectType === "custom") {
    const allSkills = [...SKILLS.domain, ...SKILLS.coordination, ...SKILLS.utility];
    const selected = await p.multiselect({
      message: "Select skills:",
      options: allSkills.map((s) => ({
        value: s.name,
        label: s.name,
        hint: s.desc,
      })),
      required: true,
    });

    if (p.isCancel(selected)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    selectedSkills = selected as string[];
  } else {
    selectedSkills = PRESETS[projectType as string] ?? [];
  }

  const cwd = process.cwd();
  const spinner = p.spinner();
  spinner.start("Installing skills...");

  try {
    await installShared(cwd);

    for (const skillName of selectedSkills) {
      spinner.message(`Installing ${pc.cyan(skillName)}...`);
      await installSkill(skillName, cwd);
    }

    spinner.stop("Skills installed!");

    p.note(
      [
        ...selectedSkills.map((s) => `${pc.green("✓")} ${s}`),
        "",
        pc.dim(`Location: ${join(cwd, ".agent", "skills")}`),
      ].join("\n"),
      "Installed"
    );

    p.outro(pc.green("Done! Open your project in your IDE to use the skills."));
  } catch (error) {
    spinner.stop("Installation failed");
    p.log.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
