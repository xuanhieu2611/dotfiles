import type { UsageWindow } from "./usage.ts";

export function percentageBar(percent: number, size: number): string {
	const filled = Math.round(Math.min(100, Math.max(0, percent)) * size / 100);
	return `${"▬".repeat(filled)}${"─".repeat(size - filled)}`;
}

/** Quota: yellow at <=60% remaining, red at <=10%. Context can use its own warning threshold. */
export function usageColor(usedPercent: number, warningAt = 40): "success" | "warning" | "error" {
	return usedPercent >= 90 ? "error" : usedPercent >= warningAt ? "warning" : "success";
}

export function resetCountdown(resetsAt: number | undefined, now = Date.now()): string {
	if (resetsAt === undefined) return "";
	const minutes = Math.max(0, Math.ceil((resetsAt * 1000 - now) / 60_000));
	if (minutes === 0) return "reset due";
	const days = Math.floor(minutes / 1440);
	const hours = Math.floor(minutes % 1440 / 60);
	if (days > 0) return `${days}d${hours}h`;
	if (hours > 0) return `${hours}h${minutes % 60}m`;
	return `${minutes}m`;
}

export function quotaDisplay(window: UsageWindow, barSize: number, now = Date.now(), emphasize = (text: string) => text): string {
	const minutes = window.windowDurationMins;
	const label = minutes === 10080 ? "week" : minutes >= 1440 ? `${Math.round(minutes / 1440)}d`
		: minutes >= 60 ? `${Math.round(minutes / 60)}h` : `${Math.round(minutes)}m`;
	const remaining = 100 - window.usedPercent;
	return [label, barSize > 0 ? percentageBar(remaining, barSize) : "", emphasize(`${Math.round(remaining)}%`),
		resetCountdown(window.resetsAt, now)].filter(Boolean).join(" ");
}
