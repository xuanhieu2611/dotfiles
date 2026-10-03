import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchUsage, normalizeUsage, parseRetryAfter, QuotaError, QuotaMonitor } from "../home/.pi/agent/extensions/codex-usage/usage.ts";

// Fabricated credentials and responses only. These tests never contact OpenAI.
const token = `header.${Buffer.from(JSON.stringify({
	"https://api.openai.com/auth": { chatgpt_account_id: "test-account" },
})).toString("base64url")}.signature`;
const snapshot = {
	accountId: "test-account",
	windows: [{ usedPercent: 20, windowDurationMins: 300 }],
	updatedAt: 1000,
};

test("temporary OAuth resolver failure keeps quota stale rather than declaring logout", async () => {
	const monitor = new QuotaMonitor((signal, onAccount) => fetchUsage({
		resolveToken: async () => { throw new Error("temporary OAuth refresh failure"); },
		signal,
		onAccount,
		fetch: (async () => { throw new Error("HTTP should not be reached"); }) as typeof fetch,
	}), () => {});
	monitor.snapshot = snapshot;
	await monitor.refresh();
	assert.equal(monitor.snapshot, snapshot);
	assert.equal(monitor.failure, "Codex quota unavailable");
});

test("missing credentials and HTTP rejection are authentication errors", async () => {
	for (const status of [401, 403]) {
		await assert.rejects(fetchUsage({
			resolveToken: async () => token,
			signal: new AbortController().signal,
			onAccount: () => {},
			fetch: (async () => new Response(null, { status })) as typeof fetch,
		}), (error: unknown) => error instanceof QuotaError && error.kind === "auth");
	}
	await assert.rejects(fetchUsage({
		resolveToken: async () => undefined,
		signal: new AbortController().signal,
		onAccount: () => {},
	}), (error: unknown) => error instanceof QuotaError && error.kind === "auth");
});

test("503 respects Retry-After and credentialed requests reject redirects", async () => {
	await assert.rejects(fetchUsage({
		resolveToken: async () => token,
		signal: new AbortController().signal,
		onAccount: () => {},
		now: () => 1000,
		fetch: (async (_url, init) => {
			assert.equal(init?.redirect, "error");
			return new Response(null, { status: 503, headers: { "Retry-After": "120" } });
		}) as typeof fetch,
	}), (error: unknown) => error instanceof QuotaError && error.retryAt === 121000);
});

test("invalid Retry-After and invalid reset timestamps are not trusted", () => {
	for (const value of ["-1", "1e308", "not-a-date", ""]) {
		assert.equal(parseRetryAfter(value, 1000), 301000);
	}
	for (const reset of [-1, 0, Infinity, NaN, "123", 8.64e12 + 1]) {
		assert.throws(() => normalizeUsage({ rate_limit: {
			primary_window: { used_percent: 20, limit_window_seconds: 18000, reset_at: reset },
		} }));
	}
});

test("abort during token resolution prevents a subsequent quota HTTP request", async () => {
	const controller = new AbortController();
	let calls = 0;
	await assert.rejects(fetchUsage({
		resolveToken: async () => { controller.abort(); return token; },
		signal: controller.signal,
		onAccount: () => {},
		fetch: (async () => { calls++; return Response.json({}); }) as typeof fetch,
	}));
	assert.equal(calls, 0);
});
