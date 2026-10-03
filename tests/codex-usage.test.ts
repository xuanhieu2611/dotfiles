import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchUsage, getAccountId, normalizeUsage, parseRetryAfter, QuotaError, QuotaMonitor } from "../home/.pi/agent/extensions/codex-usage/usage.ts";

const payload = { rate_limit: { primary_window: { used_percent: 12, limit_window_seconds: 18000, reset_at: 2000000000 } } };
const token = `header.${Buffer.from(JSON.stringify({ "https://api.openai.com/auth": { chatgpt_account_id: "account-a" } })).toString("base64url")}.signature`;
const snapshot = { accountId: "account-a", windows: normalizeUsage(payload), updatedAt: 1000 };

test("validates quota percentages, durations, reset timestamps and missing windows", () => {
	assert.equal(snapshot.windows[0].windowDurationMins, 300);
	for (const used of [NaN, Infinity, -1, 101, "12"]) {
		assert.throws(() => normalizeUsage({ rate_limit: { primary_window: { used_percent: used, limit_window_seconds: 18000 } } }));
	}
	for (const data of [null, {}, { rate_limit: {} }, { rate_limit: { primary_window: { used_percent: 12, limit_window_seconds: 0 } } }]) {
		assert.throws(() => normalizeUsage(data));
	}
});

test("extracts account identity without reading auth files", () => {
	assert.equal(getAccountId(token), "account-a");
	assert.equal(getAccountId("bad-token"), undefined);
});

test("Retry-After supports seconds, dates, and default backoff", () => {
	assert.equal(parseRetryAfter("60", 1000), 61000);
	assert.equal(parseRetryAfter("Thu, 01 Jan 1970 00:01:00 GMT", 1000), 60000);
	assert.equal(parseRetryAfter(null, 1000), 301000);
});

test("request uses resolved token and account header, parses quota", async () => {
	let identity: string | undefined;
	const result = await fetchUsage({ resolveToken: async () => token, onAccount: (id) => { identity = id; },
		signal: new AbortController().signal, now: () => 1000,
		fetch: (async (url, init) => {
			assert.equal(url, "https://chatgpt.com/backend-api/wham/usage");
			assert.equal(new Headers(init?.headers).get("ChatGPT-Account-Id"), "account-a");
			assert.equal(new Headers(init?.headers).get("Authorization"), `Bearer ${token}`);
			return Response.json(payload);
		}) as typeof fetch });
	assert.equal(identity, "account-a");
	assert.deepEqual(result, snapshot);
});

test("429 supplies retry deadline without retrying HTTP", async () => {
	await assert.rejects(fetchUsage({ resolveToken: async () => token, onAccount: () => {}, signal: new AbortController().signal,
		now: () => 1000, fetch: (async () => new Response(null, { status: 429, headers: { "Retry-After": "60" } })) as typeof fetch }),
		(error: unknown) => error instanceof QuotaError && error.retryAt === 61000);
});

test("overlapping triggers queue exactly one follow-up request", async () => {
	let calls = 0;
	let release!: () => void;
	const gate = new Promise<void>((resolve) => { release = resolve; });
	const monitor = new QuotaMonitor(async () => { calls++; if (calls === 1) await gate; return snapshot; }, () => {});
	const first = monitor.refresh();
	const second = monitor.refresh();
	const third = monitor.refresh();
	release();
	await Promise.all([first, second, third]);
	assert.equal(calls, 2);
});

test("temporary errors retain stale data, respect retry deadlines, then recover", async () => {
	let now = 1000;
	let calls = 0;
	const monitor = new QuotaMonitor(async () => {
		calls++;
		if (calls === 2) throw new QuotaError("rate limited", "rate-limit", 61000);
		return snapshot;
	}, () => {}, () => now);
	await monitor.refresh();
	await monitor.refresh();
	assert.equal(monitor.snapshot, snapshot);
	assert.equal(monitor.failure, "rate limited");
	await monitor.refresh();
	assert.equal(calls, 2);
	now = 61000;
	await monitor.refresh();
	assert.equal(calls, 3);
	assert.equal(monitor.failure, undefined);
});

test("account changes and authentication failures clear cached quota", async () => {
	let calls = 0;
	const monitor = new QuotaMonitor(async (_signal, onAccount) => {
		calls++;
		if (calls === 1) return snapshot;
		onAccount("account-b");
		throw new QuotaError("unavailable", "transient");
	}, () => {});
	await monitor.refresh();
	await monitor.refresh();
	assert.equal(monitor.snapshot, undefined);
	const auth = new QuotaMonitor(async () => { throw new QuotaError("login required", "auth"); }, () => {});
	auth.snapshot = snapshot;
	await auth.refresh();
	assert.equal(auth.snapshot, undefined);
});

test("shutdown discards late responses and aborts quota HTTP work", async () => {
	let release!: () => void;
	let signal!: AbortSignal;
	const gate = new Promise<void>((resolve) => { release = resolve; });
	const monitor = new QuotaMonitor(async (input) => { signal = input; await gate; return snapshot; }, () => {});
	const request = monitor.refresh();
	monitor.stop();
	release();
	await request;
	assert.equal(signal.aborted, true);
	assert.equal(monitor.snapshot, undefined);
});
