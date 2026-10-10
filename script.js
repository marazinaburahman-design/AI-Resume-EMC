// 0 → Shipped Resume Parser — mock build.
// No backend: the "parsing" is simulated client-side. The score and skill
// lists are derived deterministically from the file's name + size, so the
// same file always gets the same result (feels real, is fake).

const SKILL_POOL = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++",
  "React", "Next.js", "Vue", "Node.js", "Express", "Django", "Flask",
  "PostgreSQL", "MongoDB", "Redis", "GraphQL", "REST APIs", "SQL",
  "Docker", "Kubernetes", "AWS", "CI/CD", "Git", "Linux",
  "System Design", "Unit Testing", "Agile", "Tailwind CSS",
];

const ANALYSIS_STEPS = [
  { label: "Reading PDF…", ms: 700 },
  { label: "Extracting sections…", ms: 800 },
  { label: "Matching skills dictionary…", ms: 800 },
  { label: "Scoring…", ms: 600 },
];

const RING_LENGTH = 326.7; // 2 * pi * r(52), matches styles.css

const els = {
  dropzone: document.getElementById("dropzone"),
  fileInput: document.getElementById("file-input"),
  dropzoneIcon: document.getElementById("dropzone-icon"),
  dropzoneTitle: document.getElementById("dropzone-title"),
  dropzoneHint: document.getElementById("dropzone-hint"),
  status: document.getElementById("status"),
  statusText: document.getElementById("status-text"),
  error: document.getElementById("error"),
  results: document.getElementById("results"),
  ringValue: document.getElementById("ring-value"),
  scoreNumber: document.getElementById("score-number"),
  scoreVerdict: document.getElementById("score-verdict"),
  scoreSummary: document.getElementById("score-summary"),
  fileMeta: document.getElementById("file-meta"),
  presentChips: document.getElementById("present-chips"),
  missingChips: document.getElementById("missing-chips"),
  presentCount: document.getElementById("present-count"),
  missingCount: document.getElementById("missing-count"),
  resetBtn: document.getElementById("reset-btn"),
};

// ---------- file picking ----------

els.dropzone.addEventListener("click", () => els.fileInput.click());
els.dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    els.fileInput.click();
  }
});

els.fileInput.addEventListener("change", () => {
  if (els.fileInput.files[0]) handleFile(els.fileInput.files[0]);
});

["dragover", "dragenter"].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.add("dragover");
  })
);

["dragleave", "drop"].forEach((evt) =>
  els.dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    els.dropzone.classList.remove("dragover");
  })
);

els.dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

function handleFile(file) {
  hideError();

  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showError(`"${file.name}" isn't a PDF. The parser only reads PDF resumes.`);
    return;
  }

  showHolding(file.name);
  runAnalysis(file);
}

// ---------- the "pipeline" ----------

async function runAnalysis(file) {
  for (const step of ANALYSIS_STEPS) {
    els.statusText.textContent = step.label;
    await sleep(step.ms);
  }

  const result = mockParse(file);
  renderResults(result, file);
}

// Deterministic hash → seed a tiny PRNG → pick score and skills.
function mockParse(file) {
  const seed = hashString(`${file.name}:${file.size}`);
  const rand = mulberry32(seed);

  const score = 42 + Math.floor(rand() * 53); // 42–94

  const shuffled = shuffle([...SKILL_POOL], rand);
  const presentCount = 8 + Math.floor(rand() * 7); // 8–14 skills
  const missingCount = 2 + Math.floor(rand() * 4); // 2–5 gaps

  return {
    score,
    present: shuffled.slice(0, presentCount),
    missing: shuffled.slice(presentCount, presentCount + missingCount),
  };
}

function verdictFor(score) {
  if (score >= 85)
    return ["Excellent — ship it 🚀", "This resume reads like a strong hire. Tight skill coverage with very few gaps."];
  if (score >= 70)
    return ["Strong resume", "Good coverage overall. Closing the missing skills below would push this into the top tier."];
  if (score >= 55)
    return ["Decent, with gaps", "The core is there, but several expected skills never show up in the text."];
  return ["Needs work", "Too many expected skills are missing. Work through the gap list below before sending this out."];
}

// ---------- rendering ----------

function showHolding(name) {
  els.dropzone.classList.add("busy");
  els.dropzoneIcon.textContent = "⏳";
  els.dropzoneTitle.textContent = name;
  els.dropzoneHint.textContent = "Analyzing…";
  els.status.hidden = false;
  els.results.hidden = true;
}

function renderResults(result, file) {
  const [verdict, summary] = verdictFor(result.score);

  els.status.hidden = true;
  els.results.hidden = false;

  // ring
  els.ringValue.classList.remove("good", "mid", "low");
  const tier = result.score >= 70 ? "good" : result.score >= 55 ? "mid" : "low";
  els.ringValue.classList.add(tier);

  els.ringValue.style.strokeDashoffset = RING_LENGTH; // reset so it re-animates
  requestAnimationFrame(() => {
    els.ringValue.style.strokeDashoffset =
      RING_LENGTH * (1 - result.score / 100);
  });

  // count-up
  animateCount(els.scoreNumber, result.score);

  els.scoreVerdict.textContent = verdict;
  els.scoreSummary.textContent = summary;
  els.fileMeta.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB · parsed just now (mock)`;

  renderChips(els.presentChips, result.present);
  renderChips(els.missingChips, result.missing);
  els.presentCount.textContent = `${result.present.length} found`;
  els.missingCount.textContent = `${result.missing.length} gaps`;

  els.results.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderChips(container, skills) {
  container.innerHTML = "";
  if (skills.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-note";
    p.textContent = "Nothing missing — full coverage 🎉";
    container.appendChild(p);
    return;
  }
  skills.forEach((skill, i) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.textContent = skill;
    chip.style.animationDelay = `${i * 60}ms`; // stagger the pop-in
    container.appendChild(chip);
  });
}

// ---------- reset ----------

els.resetBtn.addEventListener("click", () => {
  els.fileInput.value = "";
  els.results.hidden = true;
  els.dropzone.classList.remove("busy");
  els.dropzoneIcon.textContent = "📄";
  els.dropzoneTitle.textContent = "Drop your resume here";
  els.dropzoneHint.innerHTML = 'or <span class="browse">browse files</span> · PDF only';
  els.dropzone.scrollIntoView({ behavior: "smooth", block: "center" });
});

// ---------- helpers ----------

function showError(msg) {
  els.error.textContent = msg;
  els.error.hidden = false;
}

function hideError() {
  els.error.hidden = true;
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hashString(str) {
  // FNV-1a: simple, deterministic, good enough to seed a PRNG
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function animateCount(el, target) {
  const duration = 1100;
  const start = performance.now();
  function tick(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(eased * target);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
