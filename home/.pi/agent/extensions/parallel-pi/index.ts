import { access } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const TASK_SEPARATOR = /^\s*---task---\s*$/gim;
const START_TIMEOUT_MS = 60_000;
const COMMAND_TIMEOUT_MS = 30_000;

interface PreparedTask {
	index: number;
	prompt: string;
	label: string;
	slug: string;
	suffix: string;
	branch: string;
	agentName: string;
	paneId?: string;
	workspaceId?: string;
}

interface HerdrWorktreeResult {
	result?: {
		workspace?: { workspace_id?: string };
		root_pane?: { pane_id?: string };
	};
}

export function splitParallelPrompts(input: string): string[] {
	return input
		.split(TASK_SEPARATOR)
		.map((part) => part.trim())
		.filter(Boolean);
}

function firstUsefulLine(prompt: string): string {
	const line = prompt
		.split("\n")
		.map((value) => value.trim())
		.find(Boolean) ?? "Task";

	return line
		.replace(/^#{1,6}\s+/, "")
		.replace(/^[-*+]\s+/, "")
		.replace(/^\d+[.)]\s+/, "")
		.replace(/\s+/g, " ")
		.trim();
}

function truncate(value: string, maxLength: number): string {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`;
}

export function slugifyTask(prompt: string): string {
	const slug = firstUsefulLine(prompt)
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 32)
		.replace(/-+$/g, "");

	return slug || "task";
}

function makeTask(prompt: string, index: number, stamp: string): PreparedTask {
	const slug = slugifyTask(prompt);
	const suffix = randomBytes(2).toString("hex");
	const shortSlug = slug.slice(0, 18).replace(/-+$/g, "") || "task";

	return {
		index,
		prompt,
		label: truncate(firstUsefulLine(prompt), 56),
		slug,
		suffix,
		branch: `pi-parallel/${stamp}-${slug}-${suffix}`,
		agentName: `p${index}-${shortSlug}-${suffix}`.slice(0, 32).replace(/-+$/g, ""),
	};
}

function makeStamp(now = new Date()): string {
	const pad = (value: number) => String(value).padStart(2, "0");
	return [
		now.getFullYear(),
		pad(now.getMonth() + 1),
		pad(now.getDate()),
		"-",
		pad(now.getHours()),
		pad(now.getMinutes()),
		pad(now.getSeconds()),
	].join("");
}

function childPrompt(prompt: string): string {
	return [
		"Work on the task below in the current dedicated Git worktree.",
		"Keep the changes focused on this task. Do not switch branches or manage Git worktrees.",
		"",
		prompt,
	].join("\n");
}

function parseJsonOutput<T>(output: string): T {
	const trimmed = output.trim();
	try {
		return JSON.parse(trimmed) as T;
	} catch {
		const start = trimmed.indexOf("{");
		const end = trimmed.lastIndexOf("}");
		if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T;
		throw new Error(`Expected JSON from Herdr, received: ${truncate(trimmed || "(empty output)", 300)}`);
	}
}

function commandError(command: string, stderr: string, stdout: string): Error {
	const detail = stderr.trim() || stdout.trim() || "unknown error";
	return new Error(`${command}: ${truncate(detail, 500)}`);
}

async function executableExists(path: string): Promise<boolean> {
	if (!path.includes("/")) return true;
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function resolveHerdr(pi: ExtensionAPI): Promise<string> {
	const candidates = [
		process.env.HERDR_BIN,
		"herdr",
		join(homedir(), ".local", "bin", "herdr"),
	].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

	for (const candidate of candidates) {
		if (!(await executableExists(candidate))) continue;
		try {
			const result = await pi.exec(candidate, ["--version"], { timeout: 5_000 });
			if (result.code === 0) return candidate;
		} catch {}
	}

	throw new Error("Herdr CLI was not found. Install Herdr or set HERDR_BIN to its executable path.");
}

async function git(
	pi: ExtensionAPI,
	cwd: string,
	args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
	return pi.exec("git", args, { cwd, timeout: COMMAND_TIMEOUT_MS });
}

async function createWorktree(
	pi: ExtensionAPI,
	herdr: string,
	repoRoot: string,
	baseCommit: string,
	task: PreparedTask,
): Promise<void> {
	const result = await pi.exec(
		herdr,
		[
			"worktree",
			"create",
			"--cwd",
			repoRoot,
			"--branch",
			task.branch,
			"--base",
			baseCommit,
			"--label",
			task.label,
			"--no-focus",
		],
		{ timeout: COMMAND_TIMEOUT_MS },
	);

	if (result.code !== 0) throw commandError("herdr worktree create failed", result.stderr, result.stdout);

	const payload = parseJsonOutput<HerdrWorktreeResult>(result.stdout);
	task.paneId = payload.result?.root_pane?.pane_id;
	task.workspaceId = payload.result?.workspace?.workspace_id;
	if (!task.paneId) throw new Error("Herdr created the worktree but did not return a root pane ID.");
}

async function startAndPrompt(pi: ExtensionAPI, herdr: string, task: PreparedTask): Promise<void> {
	if (!task.paneId) throw new Error("Cannot start Pi without a Herdr pane ID.");

	const start = await pi.exec(
		herdr,
		["agent", "start", task.agentName, "--kind", "pi", "--pane", task.paneId, "--timeout", String(START_TIMEOUT_MS)],
		{ timeout: START_TIMEOUT_MS + 5_000 },
	);
	if (start.code !== 0) throw commandError(`Could not start ${task.agentName}`, start.stderr, start.stdout);

	const prompt = await pi.exec(
		herdr,
		["agent", "prompt", task.agentName, childPrompt(task.prompt)],
		{ timeout: COMMAND_TIMEOUT_MS },
	);
	if (prompt.code !== 0) throw commandError(`Could not prompt ${task.agentName}`, prompt.stderr, prompt.stdout);
}

export default function parallelPiExtension(pi: ExtensionAPI) {
	pi.registerCommand("parallel", {
		description: "Start multiple prompts in parallel Pi worktrees",
		handler: async (args, ctx) => {
			if (ctx.mode !== "tui") {
				ctx.ui.notify("/parallel requires Pi's interactive TUI.", "error");
				return;
			}

			let input = args.trim();
			if (!input) {
				const edited = await ctx.ui.editor(
					"Parallel prompts - separate tasks with a line containing ---task---",
					"",
				);
				if (edited === undefined) {
					ctx.ui.notify("Parallel launch cancelled.", "info");
					return;
				}
				input = edited.trim();
			}

			const prompts = splitParallelPrompts(input);
			if (prompts.length < 2) {
				ctx.ui.notify("Add at least two prompts separated by a line containing ---task---.", "warning");
				return;
			}

			const repo = await git(pi, ctx.cwd, ["rev-parse", "--show-toplevel"]);
			if (repo.code !== 0) {
				ctx.ui.notify("/parallel must be run inside a Git repository.", "error");
				return;
			}
			const repoRoot = repo.stdout.trim();

			const head = await git(pi, repoRoot, ["rev-parse", "HEAD"]);
			if (head.code !== 0) {
				ctx.ui.notify("The repository does not have a valid HEAD commit.", "error");
				return;
			}
			const baseCommit = head.stdout.trim();

			const status = await git(pi, repoRoot, ["status", "--porcelain"]);
			if (status.code !== 0) {
				ctx.ui.notify("Could not inspect the Git working tree.", "error");
				return;
			}
			if (status.stdout.trim()) {
				const proceed = await ctx.ui.confirm(
					"Uncommitted changes",
					`Child agents will start from ${baseCommit.slice(0, 8)} and will not see your uncommitted changes. Continue?`,
				);
				if (!proceed) {
					ctx.ui.notify("Parallel launch cancelled.", "info");
					return;
				}
			}

			let herdr: string;
			try {
				herdr = await resolveHerdr(pi);
			} catch (error) {
				ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
				return;
			}

			const stamp = makeStamp();
			const tasks = prompts.map((prompt, index) => makeTask(prompt, index + 1, stamp));
			ctx.ui.setStatus("parallel-pi", `creating ${tasks.length} worktrees`);

			const created: PreparedTask[] = [];
			for (const task of tasks) {
				try {
					await createWorktree(pi, herdr, repoRoot, baseCommit, task);
					created.push(task);
				} catch (error) {
					ctx.ui.setStatus("parallel-pi", undefined);
					ctx.ui.notify(
						`Stopped after creating ${created.length} of ${tasks.length} worktrees. ${error instanceof Error ? error.message : String(error)}`,
						"error",
					);
					return;
				}
			}

			ctx.ui.setStatus("parallel-pi", `starting ${created.length} Pi agents`);
			const results = await Promise.allSettled(created.map((task) => startAndPrompt(pi, herdr, task)));
			ctx.ui.setStatus("parallel-pi", undefined);

			const failures = results
				.map((result, index) => ({ result, task: created[index] }))
				.filter((item): item is { result: PromiseRejectedResult; task: PreparedTask } => item.result.status === "rejected");

			for (const { result, task } of failures) {
				const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
				ctx.ui.notify(`${task.label}: ${reason}`, "error");
			}

			const started = created.filter((_, index) => results[index]?.status === "fulfilled");
			if (started.length > 0) {
				const summary = started
					.map((task, index) => `${index + 1}. ${task.label} (${task.agentName})`)
					.join("\n");
				ctx.ui.notify(`Started ${started.length} parallel Pi agent${started.length === 1 ? "" : "s"}:\n${summary}`, "info");
			}
		},
	});
}
