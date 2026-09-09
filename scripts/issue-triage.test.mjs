import assert from "node:assert/strict";
import test from "node:test";
import { classifyIssue } from "./issue-triage.mjs";

const DOCS_FIXTURE = {
  title: "[Docs]: first-run screen is hard to find",
  body: `### Page or file
docs/user/getting-started.md

### Documentation problem
Confusing instructions

### What should change?
Point newcomers at the first useful screen after install.

### Validation context
I ran \`jobctrl doctor\` and opened the web dashboard. The CLI printed a first useful screen hint.

### Data-safety confirmation
- [x] I have not included secrets, private profile data, resumes, generated application materials, raw logs, browser profiles, SQLite databases, or local paths.
`,
};

const SETUP_FIXTURE = {
  title: "[Bug]: source install fails on first run",
  body: `### Affected area
Setup or install

### What happened?
\`pnpm dev:setup\` fails before the first useful screen appears.

### Expected behavior
Setup completes and jobctrl doctor reports a healthy environment.

### Reproduction steps
1. Run pnpm dev:setup
2. Run jobctrl doctor
3. Open the dashboard

### Data-safety confirmation
- [x] I have not included secrets, private profile data, resumes, generated application materials, raw logs, browser profiles, SQLite databases, or local paths.
`,
};

const SECURITY_CONTACT_FIXTURE = {
  title: "[Security contact]: request private reporting path",
  body: `### Confirmation
- [x] I need a private contact path for a possible vulnerability and have not included vulnerability details in this public issue.
- [x] I have not included secrets, private profile data, resumes, generated application materials, raw logs, browser profiles, SQLite databases, local paths, or exploit details.

### Minimal public summary
local API boundary
`,
};

const BLANK_ISSUE_FIXTURE = {
  title: "Worker Temporal workflow never starts",
  body: `The python worker and Temporal automation engine stay idle after install.
I also checked an API route / JSON-RPC endpoint on the server.
`,
};

test("documentation fixture keeps docs area and ignores boilerplate keywords", () => {
  const labels = classifyIssue(DOCS_FIXTURE);
  assert.ok(labels.includes("area: docs"));
  assert.ok(labels.includes("type: documentation"));
  assert.ok(labels.includes("status: needs triage"));
  assert.equal(labels.includes("area: web"), false);
  assert.equal(labels.includes("area: cli-worker"), false);
  assert.equal(labels.includes("area: security"), false);
  assert.equal(labels.includes("privacy: review-needed"), false);
});

test("setup fixture uses structured area without unrelated areas", () => {
  const labels = classifyIssue(SETUP_FIXTURE);
  assert.ok(labels.includes("area: setup"));
  assert.ok(labels.includes("type: bug"));
  assert.equal(labels.includes("area: web"), false);
  assert.equal(labels.includes("area: cli-worker"), false);
  assert.equal(labels.includes("area: docs"), false);
  assert.equal(labels.includes("privacy: review-needed"), false);
});

test("security-contact fixture retains security and privacy-review labels", () => {
  const labels = classifyIssue(SECURITY_CONTACT_FIXTURE);
  assert.ok(labels.includes("type: security-contact"));
  assert.ok(labels.includes("area: security"));
  assert.ok(labels.includes("privacy: review-needed"));
});

test("blank issue uses conservative keyword fallback", () => {
  const labels = classifyIssue(BLANK_ISSUE_FIXTURE);
  assert.ok(labels.includes("area: cli-worker"));
  assert.ok(labels.includes("area: api"));
  assert.ok(labels.includes("status: needs triage"));
});
