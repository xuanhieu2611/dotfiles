import assert from "node:assert/strict";
import { test } from "node:test";
import { percentageBar, quotaDisplay, resetCountdown, usageColor } from "../home/.pi/agent/extensions/codex-usage/display.ts";

test("bars show empty, full, and intermediate values", () => {
	assert.equal(percentageBar(0, 4), "────");
	assert.equal(percentageBar(100, 4), "▬▬▬▬");
	assert.equal(percentageBar(50, 4), "▬▬──");
});

test("colors reflect consumed quota or context, not remaining quota", () => {
	assert.equal(usageColor(5), "success");
	assert.equal(usageColor(39), "success");
	assert.equal(usageColor(40), "warning");
	assert.equal(usageColor(69, 70), "success");
	assert.equal(usageColor(70, 70), "warning");
	assert.equal(usageColor(89), "warning");
	assert.equal(usageColor(90), "error");
});

test("countdown handles missing, overdue, minutes, hours, and days", () => {
	assert.equal(resetCountdown(undefined, 0), "");
	assert.equal(resetCountdown(1, 2000), "reset due");
	assert.equal(resetCountdown(60, 0), "1m");
	assert.equal(resetCountdown(12000, 0), "3h20m");
	assert.equal(resetCountdown(244800, 0), "2d20h");
});

test("percentage emphasis does not affect labels or reset times", () => {
	assert.equal(quotaDisplay({ usedPercent: 5, windowDurationMins: 300 }, 0, 0, (text) => `<bold>${text}</bold>`), "5h <bold>95%</bold>");
});

test("quota displays remaining percentage, weekly label, and countdown", () => {
	assert.equal(quotaDisplay({ usedPercent: 5, windowDurationMins: 300, resetsAt: 12000 }, 0, 0), "5h 95% 3h20m");
	assert.equal(quotaDisplay({ usedPercent: 71, windowDurationMins: 10080, resetsAt: 244800 }, 0, 0), "week 29% 2d20h");
	assert.equal(quotaDisplay({ usedPercent: 50, windowDurationMins: 300 }, 4, 0), "5h ▬▬── 50%");
});
