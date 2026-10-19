import type {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Writes Automation_For_QA_Notice.md after every run — a human-readable
 * summary of anything that did NOT cleanly pass (failed, timed out,
 * skipped, or fixme), with a best-guess reason so whoever picks up the
 * report (QA, dev, or Kenneth re-running this before the interview)
 * isn't starting from a blank stack trace.
 *
 * This does not replace reading DECISIONS.md / the stack trace — it's a
 * triage aid, not a verdict. Every entry says so.
 */

type Entry = {
  title: string;
  file: string;
  status: TestResult["status"];
  annotation?: string;
  errorMessage?: string;
  likelyReason: string;
};

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\u001b\[[0-9;]*m/g;

function guessReason(result: TestResult, status: TestResult["status"], hasFixme: boolean): string {
  const msg = (result.error?.message ?? "").replace(ANSI_RE, "").toLowerCase();

  if (status === "skipped" && !hasFixme) {
    return "Skipped intentionally — check the inline comment / test.skip() condition in the spec for why.";
  }
  if (hasFixme) {
    return "Marked test.fixme() — expected to fail. This is a tracked, known gap or bug, not a surprise. " +
      "Confirm the linked DECISIONS.md entry or ticket is still open; if this now PASSES, the fixme should be removed.";
  }
  if (status === "timedOut") {
    return "Timed out — most likely the mock server isn't running, or SEAT_HOLD_BASE_URL points somewhere unreachable " +
      "(a cold-starting Render free-tier instance can take 30-60s to wake). Check the server before assuming the code regressed.";
  }
  if (msg.includes("econnrefused") || msg.includes("fetch failed") || msg.includes("connect")) {
    return "Connection failure — the mock server is probably not running, or SEAT_HOLD_BASE_URL is wrong. " +
      "Not a behavior regression by itself.";
  }
  if (msg.includes("expect(received).tobe") || msg.includes("tobeequal") || msg.includes("toequal")) {
    return "Assertion mismatch — the mock's actual response no longer matches what DECISIONS.md documents for this " +
      "case. Check whether main.go changed, or whether this is a genuine behavior regression worth a new decision.";
  }
  return "No specific pattern matched — read the stack trace below and compare the actual response against the " +
    "relevant DECISIONS.md entry referenced in the test name.";
}

export default class QANoticeReporter implements Reporter {
  private entries: Entry[] = [];
  private outputFile: string;

  constructor(options: { outputFile?: string } = {}) {
    this.outputFile = options.outputFile ?? "Automation_For_QA_Notice.md";
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const hasFixme = test.annotations.some((a) => a.type === "fixme");
    const isNotable =
      result.status === "failed" ||
      result.status === "timedOut" ||
      result.status === "skipped" ||
      hasFixme;

    if (!isNotable) return;

    this.entries.push({
      title: test.title,
      file: test.location.file.split("/").pop() ?? test.location.file,
      status: result.status,
      annotation: hasFixme ? "fixme" : undefined,
      errorMessage: result.error?.message?.replace(ANSI_RE, ""),
      likelyReason: guessReason(result, result.status, hasFixme),
    });
  }

  onEnd(result: FullResult) {
    const lines: string[] = [];
    lines.push("# Automation_For_QA_Notice");
    lines.push("");
    lines.push(`Run finished: **${result.status}**, generated ${new Date().toISOString()}`);
    lines.push("");
    lines.push(
      "Auto-generated after every `npx playwright test` run (see `reporters/qa-notice-reporter.ts`). " +
      "Lists every test that did NOT cleanly pass — failed, timed out, skipped, or marked `fixme` — with a " +
      "best-guess reason. This is a triage aid, not a verdict: always check the referenced DECISIONS.md entry " +
      "and the actual stack trace before concluding anything."
    );
    lines.push("");

    if (this.entries.length === 0) {
      lines.push("**Nothing to report — every test passed cleanly. No failures, timeouts, skips, or fixmes.**");
    } else {
      for (const e of this.entries) {
        lines.push(`## ${e.title}`);
        lines.push("");
        lines.push(`- **File:** \`${e.file}\``);
        lines.push(`- **Status:** ${e.status}${e.annotation ? ` (${e.annotation})` : ""}`);
        lines.push(`- **Likely reason:** ${e.likelyReason}`);
        if (e.errorMessage) {
          lines.push("- **Error:**");
          lines.push("  ```");
          for (const line of e.errorMessage.split("\n").slice(0, 10)) {
            lines.push(`  ${line}`);
          }
          lines.push("  ```");
        }
        lines.push("");
      }
    }

    writeFileSync(join(process.cwd(), this.outputFile), lines.join("\n"), "utf-8");
    // eslint-disable-next-line no-console
    console.log(`\nQA notice written to ${this.outputFile}`);
  }
}
