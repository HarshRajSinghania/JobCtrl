export const LABEL_DEFINITIONS = {
  "status: needs triage": {
    color: "fbca04",
    description: "Needs maintainer review and prioritization.",
  },
  "type: bug": {
    color: "d73a4a",
    description: "Broken or incorrect behavior.",
  },
  "type: documentation": {
    color: "0075ca",
    description: "Documentation issue or improvement.",
  },
  "type: feature": {
    color: "a2eeef",
    description: "New capability or product improvement.",
  },
  "type: qa-regression": {
    color: "b60205",
    description: "Visible regression in a product or QA flow.",
  },
  "type: question": {
    color: "d876e3",
    description: "Usage, setup, or contributor-workflow question.",
  },
  "type: security-contact": {
    color: "ee0701",
    description: "Public request for a private vulnerability contact path.",
  },
  "area: api": {
    color: "c2e0c6",
    description: "TypeScript API or API contract.",
  },
  "area: browser-extension": {
    color: "c2e0c6",
    description: "Browser extension capture or autofill.",
  },
  "area: cli-worker": {
    color: "c2e0c6",
    description: "Python CLI, worker, or automation engine.",
  },
  "area: docs": {
    color: "c2e0c6",
    description: "Repository or published documentation.",
  },
  "area: github": {
    color: "c2e0c6",
    description: "GitHub workflows, templates, or contribution metadata.",
  },
  "area: setup": {
    color: "c2e0c6",
    description: "Install, setup, or local environment.",
  },
  "area: security": {
    color: "c2e0c6",
    description: "Security posture or private-reporting coordination.",
  },
  "area: web": {
    color: "c2e0c6",
    description: "React web app or frontend product flow.",
  },
  "privacy: review-needed": {
    color: "5319e7",
    description: "Maintainers should check the public issue for sensitive data exposure.",
  },
  "release: possible-blocker": {
    color: "e99695",
    description: "May block a public release, install path, or documented first-run flow.",
  },
};

const TYPE_RULES = [
  ["type: security-contact", /\[security contact\]|security contact request|minimal public summary/],
  ["type: qa-regression", /\[qa\]|expected invariant|regression surface|what broke\?/],
  ["type: documentation", /\[docs\]|page or file|documentation problem|broken link/],
  ["type: feature", /\[feature\]|problem to solve|proposed behavior|data, safety, or automation impact/],
  ["type: bug", /\[bug\]|what happened\?|expected behavior|reproduction steps/],
  ["type: question", /\[question\]|question or support|contributor workflow/],
];

const AREA_KEYWORD_RULES = [
  ["area: web", /web app|dashboard|jobs|apply review|artifacts|profile|settings|frontend|react|vite/],
  ["area: api", /typescript api|api route|json-rpc|sse|server|read model|endpoint/],
  ["area: cli-worker", /python worker|worker|cli|jobctrl doctor|temporal|automation engine/],
  ["area: browser-extension", /browser extension|extension|capture|autofill|ats/],
  ["area: docs", /documentation|docs site|readme|docs\//],
  ["area: setup", /setup|install|pnpm dev:setup|environment|first run/],
  ["area: github", /github workflow|github workflows|actions|ci|dco|pull request|issue template/],
  ["area: security", /security|vulnerability|credential|secret|token|private contact/],
];

const STRUCTURED_AREA_LABELS = {
  "web app": "area: web",
  "dashboard or jobs": "area: web",
  "apply review": "area: web",
  artifacts: "area: web",
  "profile or settings": "area: web",
  "typescript api": "area: api",
  "python worker or cli": "area: cli-worker",
  "cli or worker": "area: cli-worker",
  "browser extension": "area: browser-extension",
  documentation: "area: docs",
  "documentation site": "area: docs",
  "setup or install": "area: setup",
  setup: "area: setup",
  "github workflows": "area: github",
  "github workflow": "area: github",
};

function stripBoilerplate(body) {
  return (body ?? "")
    .replace(/### Data-safety confirmation[\s\S]*?(?=\n### |$)/gi, "")
    .replace(/### Public issue confirmation[\s\S]*?(?=\n### |$)/gi, "")
    .replace(/### Confirmation[\s\S]*?(?=\n### |$)/gi, "");
}

function extractFormValue(body, heading) {
  const pattern = new RegExp(
    `### ${heading}\s*\n+([^\n#][^\n]*)`,
    "i",
  );
  const match = body.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function structuredAreaLabel(title, body) {
  if (/\[docs\]/i.test(title) || extractFormValue(body, "Page or file") || extractFormValue(body, "Documentation problem")) {
    return "area: docs";
  }
  if (/\[security contact\]/i.test(title) || extractFormValue(body, "Minimal public summary")) {
    return "area: security";
  }
  const selections = [
    extractFormValue(body, "Affected area"),
    extractFormValue(body, "Regression surface"),
  ];

  for (const raw of selections) {
    const key = raw.toLowerCase();
    if (!key || key === "unsure" || key === "other") {
      continue;
    }
    if (STRUCTURED_AREA_LABELS[key]) {
      return STRUCTURED_AREA_LABELS[key];
    }
  }
  return null;
}

export function classifyIssue({ title = "", body = "", currentLabels = [] } = {}) {
  const userBody = stripBoilerplate(body);
  const haystack = `${title}\n${userBody}`.toLowerCase();
  const titleText = title.toLowerCase();
  const current = new Set(currentLabels);
  const labelsToAdd = new Set();

  if (![...current].some((label) => label.startsWith("status: "))) {
    labelsToAdd.add("status: needs triage");
  }

  for (const [label, pattern] of TYPE_RULES) {
    if (pattern.test(haystack) && ![...current].some((existing) => existing.startsWith("type: "))) {
      labelsToAdd.add(label);
      break;
    }
  }

  const structuredArea = structuredAreaLabel(title, userBody);
  if (structuredArea) {
    labelsToAdd.add(structuredArea);
  } else {
    for (const [label, pattern] of AREA_KEYWORD_RULES) {
      if (pattern.test(haystack)) {
        labelsToAdd.add(label);
      }
    }
  }

  if (/release blocker|blocks a public release|public release|first-run flow|source install/.test(haystack)) {
    labelsToAdd.add("release: possible-blocker");
  }

  const securityContact =
    labelsToAdd.has("type: security-contact") || current.has("type: security-contact");
  if (
    securityContact ||
    /\b(security|vulnerability|secret|credential|token|api key|private data)\b/.test(titleText)
  ) {
    labelsToAdd.add("privacy: review-needed");
  }

  if (securityContact) {
    labelsToAdd.add("area: security");
    labelsToAdd.add("privacy: review-needed");
  }

  return [...labelsToAdd].filter((label) => !current.has(label)).sort();
}
