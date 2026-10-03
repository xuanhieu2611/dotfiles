import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { fetchUsage, QuotaMonitor, REFRESH_INTERVAL_MS, type UsageWindow } from "./codex-usage/usage.ts";
import { percentageBar, quotaDisplay, usageColor } from "./codex-usage/display.ts";

function formatWindow(window: UsageWindow): string {
	const minutes = window.windowDurationMins;
	const duration = minutes >= 1440 ? `${Math.round(minutes / 1440)}d`
		: minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes)}m`;
	return `${duration} ${Math.round(100 - window.usedPercent)}% left`;
}

function formatTokens(tokens: number): string {
	if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}m`;
	if (tokens >= 10_000) return `${Math.round(tokens / 1000)}k`;
	if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k`;
	return String(tokens);
}

function getSessionCost(ctx: ExtensionContext): number {
	let cost = 0;
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message" || entry.message.role !== "assistant") continue;
		cost += (entry.message as AssistantMessage).usage.cost.total;
	}
	return cost;
}

export default function codexUsageFooter(pi: ExtensionAPI) {
	let currentContext: ExtensionContext | undefined;
	let monitor: QuotaMonitor | undefined;
	let refreshTimer: ReturnType<typeof setTimeout> | undefined;
	let requestRender = () => {};

	function scheduleRefresh(): void {
		if (refreshTimer) clearTimeout(refreshTimer);
		if (!monitor) return;
		const delay = monitor.failure ? Math.max(1000, monitor.nextAllowedAt - Date.now()) : REFRESH_INTERVAL_MS;
		// Timers are only for quota HTTP requests, never for interrupting OAuth refresh.
		refreshTimer = setTimeout(() => void refresh(), Math.min(delay, 2_147_483_647));
		refreshTimer.unref?.();
	}

	async function refresh(): Promise<void> {
		const active = monitor;
		if (!active || currentContext?.mode !== "tui") return;
		await active.refresh();
		if (monitor === active) scheduleRefresh();
	}

	pi.registerCommand("codex-usage", {
		description: "Refresh Codex subscription quota and show reset times",
		handler: async (_args, ctx) => {
			currentContext = ctx;
			await refresh();
			const snapshot = monitor?.snapshot;
			const failure = monitor?.failure;
			if (!snapshot) {
				ctx.ui.notify(failure ?? "Codex quota unavailable", "warning");
				return;
			}
			const details = snapshot.windows.map((window) => {
				const reset = window.resetsAt === undefined ? "reset time unavailable"
					: `resets ${new Date(window.resetsAt * 1000).toLocaleString()}`;
				return `${formatWindow(window)} (${reset})`;
			});
			details.push(`Last checked ${new Date(snapshot.updatedAt).toLocaleString()}`);
			if (failure) details.push(`Stale: ${failure}`);
			if (monitor && monitor.nextAllowedAt > Date.now()) {
				details.push(`Retry after ${new Date(monitor.nextAllowedAt).toLocaleString()}`);
			}
			ctx.ui.notify(details.join("\n"), failure ? "warning" : "info");
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		currentContext = ctx;
		if (ctx.mode !== "tui" || !ctx.hasUI) return;
		monitor?.stop();
		if (refreshTimer) clearTimeout(refreshTimer);
		monitor = new QuotaMonitor((signal, onAccount) => fetchUsage({
			// Unlike getApiKeyForProvider, this preserves refresh errors so temporary
			// OAuth failures do not masquerade as a missing login.
			resolveToken: async () => (await ctx.modelRegistry.getProviderAuth("openai-codex"))?.auth.apiKey,
			signal,
			onAccount,
		}), () => requestRender());

		ctx.ui.setFooter((tui, theme, footerData) => {
			const unsubscribe = footerData.onBranchChange(() => tui.requestRender());
			requestRender = () => tui.requestRender();
			// Update countdowns locally without making extra quota requests.
			const countdownTimer = setInterval(() => tui.requestRender(), 60_000);
			countdownTimer.unref?.();
			return {
				dispose() { clearInterval(countdownTimer); unsubscribe(); requestRender = () => {}; },
				invalidate() {},
				render(width: number): string[] {
					const activeContext = currentContext ?? ctx;
					const usage = activeContext.getContextUsage();
					const level = activeContext.thinkingLevel ?? pi.getThinkingLevel();
					const reasoning = level ? ` (${level.charAt(0).toUpperCase()}${level.slice(1)})` : "";
					const modelText = `${theme.fg("accent", activeContext.model?.id ?? "no model")}${theme.fg("muted", reasoning)}`;
					const snapshot = monitor?.snapshot;
					const now = Date.now();
					const costText = theme.fg("muted", `$${getSessionCost(activeContext).toFixed(3)}`);
					const separator = theme.fg("dim", " | ");
					const quotaLabel = activeContext.model?.provider === "openai-codex" ? "" : theme.fg("dim", "Codex: ");
					const buildLines = (barSize: number) => {
						let contextText = theme.fg("dim", "ctx unavailable");
						if (usage?.percent !== null && usage?.percent !== undefined) {
							const color = usageColor(usage.percent, 70);
							const bar = barSize > 0 ? `${percentageBar(usage.percent, barSize)} ` : "";
							const percent = theme.style(`${Math.round(usage.percent)}%`, { fg: color, bold: true });
							contextText = theme.fg(color, `ctx ${bar}${percent}/${formatTokens(usage.contextWindow)}`);
						}

						let quotaText = theme.fg(monitor?.failure ? "warning" : "dim", monitor?.failure ?? "quota loading");
						if (snapshot) {
							quotaText = snapshot.windows.map((window) => {
								const color = monitor?.failure ? "dim" : usageColor(window.usedPercent);
								const text = quotaDisplay(window, barSize, now,
									(value) => theme.style(value, { fg: color, bold: true }));
								return theme.fg(color, text);
							}).join(separator);
							if (monitor?.failure) quotaText += theme.fg("warning", " (stale)");
						}
						return [`${modelText}${separator}${contextText}`, `${costText}${separator}${quotaLabel}${quotaText}`];
					};
					// Shorten bars before truncating useful text on narrow terminals.
					let lines = buildLines(6);
					for (const size of [4, 0]) {
						if (lines.every((line) => visibleWidth(line) <= width)) break;
						lines = buildLines(size);
					}
					return lines.map((line) => truncateToWidth(line, width));
				},
			};
		});
		void refresh();
	});

	pi.on("model_select", async (_event, ctx) => {
		currentContext = ctx;
		requestRender();
		void refresh();
	});

	pi.on("thinking_level_select", async (_event, ctx) => {
		currentContext = ctx;
		requestRender();
	});

	pi.on("agent_settled", async (_event, ctx) => {
		currentContext = ctx;
		void refresh();
	});

	pi.on("session_shutdown", async () => {
		if (refreshTimer) clearTimeout(refreshTimer);
		refreshTimer = undefined;
		monitor?.stop();
		monitor = undefined;
		currentContext = undefined;
	});
}
