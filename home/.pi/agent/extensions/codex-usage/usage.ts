export interface UsageWindow {
	usedPercent: number;
	windowDurationMins: number;
	resetsAt?: number;
}

export interface UsageSnapshot {
	accountId: string;
	windows: UsageWindow[];
	updatedAt: number;
}

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

export class QuotaError extends Error {
	constructor(
		message: string,
		public readonly kind: "auth" | "transient" | "rate-limit",
		public readonly retryAt?: number,
	) {
		super(message);
	}
}

function object(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

export function getAccountId(token: string): string | undefined {
	try {
		const payload = token.split(".")[1];
		if (!payload) return undefined;
		const claims = object(JSON.parse(Buffer.from(payload, "base64url").toString("utf8")));
		const id = object(claims?.["https://api.openai.com/auth"])?.chatgpt_account_id;
		return typeof id === "string" && id.trim().length > 0 ? id : undefined;
	} catch {
		return undefined;
	}
}

export function normalizeUsage(data: unknown): UsageWindow[] {
	const limits = object(object(data)?.rate_limit);
	if (!limits) throw new QuotaError("Invalid quota response", "transient");
	const windows: UsageWindow[] = [];
	for (const name of ["primary_window", "secondary_window"]) {
		const raw = limits[name];
		if (raw === null || raw === undefined) continue;
		const window = object(raw);
		const used = window?.used_percent;
		const duration = window?.limit_window_seconds;
		const reset = window?.reset_at;
		if (typeof used !== "number" || !Number.isFinite(used) || used < 0 || used > 100 ||
			typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0 ||
			(reset !== undefined && reset !== null && (typeof reset !== "number" || !Number.isFinite(reset) || reset <= 0 || reset > 8.64e12))) {
			throw new QuotaError("Invalid quota window", "transient");
		}
		windows.push({
			usedPercent: used,
			windowDurationMins: duration / 60,
			...(typeof reset === "number" ? { resetsAt: reset } : {}),
		});
	}
	if (windows.length === 0) throw new QuotaError("No quota windows returned", "transient");
	return windows.sort((a, b) => a.windowDurationMins - b.windowDurationMins);
}

export function parseRetryAfter(value: string | null, now: number): number {
	if (value !== null && value.trim() !== "") {
		const seconds = Number(value);
		if (Number.isFinite(seconds)) {
			const deadline = now + seconds * 1000;
			return seconds >= 0 && Number.isFinite(deadline) && deadline <= 8.64e15
				? deadline : now + REFRESH_INTERVAL_MS;
		}
		const date = Date.parse(value);
		if (Number.isFinite(date)) return Math.max(now, date);
	}
	return now + REFRESH_INTERVAL_MS;
}

export async function fetchUsage(options: {
	resolveToken: () => Promise<string | undefined>;
	onAccount: (accountId: string) => void;
	signal: AbortSignal;
	fetch?: typeof fetch;
	now?: () => number;
}): Promise<UsageSnapshot> {
	const now = options.now ?? Date.now;
	// The owning Pi runtime handles refresh-token rotation and credential locking.
	const token = await options.resolveToken();
	options.signal.throwIfAborted();
	if (!token) throw new QuotaError("Pi Codex login required", "auth");
	const accountId = getAccountId(token);
	if (!accountId) throw new QuotaError("Pi Codex account unavailable", "auth");
	options.onAccount(accountId);
	const response = await (options.fetch ?? fetch)(USAGE_URL, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/json",
			"User-Agent": "pi-agent",
			"ChatGPT-Account-Id": accountId,
		},
		redirect: "error",
		signal: AbortSignal.any([options.signal, AbortSignal.timeout(15_000)]),
	});
	if (response.status === 401 || response.status === 403) {
		throw new QuotaError("OpenAI rejected the Pi Codex credentials", "auth");
	}
	if (response.status === 429 || response.status === 503) {
		throw new QuotaError(response.status === 429 ? "Quota request rate-limited" : "Quota service unavailable",
			"rate-limit", parseRetryAfter(response.headers.get("retry-after"), now()));
	}
	if (!response.ok) throw new QuotaError(`Quota request failed (HTTP ${response.status})`, "transient");
	return { accountId, windows: normalizeUsage(await response.json()), updatedAt: now() };
}

/** One request at a time. A trigger during a request queues one fresh follow-up. */
export class QuotaMonitor {
	snapshot?: UsageSnapshot;
	failure?: string;
	nextAllowedAt = 0;
	private pending = false;
	private running?: Promise<void>;
	private stopped = false;
	private failures = 0;
	private controller = new AbortController();

	constructor(
		private readonly read: (signal: AbortSignal, onAccount: (id: string) => void) => Promise<UsageSnapshot>,
		private readonly changed: () => void,
		private readonly now = Date.now,
	) {}

	refresh(): Promise<void> {
		if (this.stopped) return Promise.resolve();
		this.pending = true;
		if (this.running) return this.running;
		this.running = this.drain().finally(() => { this.running = undefined; });
		return this.running;
	}

	stop(): void {
		this.stopped = true;
		this.pending = false;
		this.controller.abort();
	}

	private async drain(): Promise<void> {
		while (this.pending && !this.stopped) {
			this.pending = false;
			if (this.now() < this.nextAllowedAt) break;
			try {
				const snapshot = await this.read(this.controller.signal, (id) => {
					if (this.snapshot && this.snapshot.accountId !== id) {
						this.snapshot = undefined;
						this.changed();
					}
				});
				if (this.stopped) return;
				this.snapshot = snapshot;
				this.failure = undefined;
				this.failures = 0;
				this.nextAllowedAt = 0;
			} catch (error) {
				if (this.stopped) return;
				const failure = error instanceof QuotaError ? error : new QuotaError("Codex quota unavailable", "transient");
				this.failure = failure.message;
				if (failure.kind === "auth") this.snapshot = undefined;
				this.failures++;
				this.nextAllowedAt = Math.max(failure.retryAt ?? 0,
					this.now() + Math.min(REFRESH_INTERVAL_MS, 15_000 * 2 ** Math.min(this.failures - 1, 5)));
			}
			this.changed();
		}
	}
}
