// ponytail: single-key localStorage, re-render on every mutation. No diffing for ~hundreds of items.

const STORAGE_KEY = "patch-notes.games";
const STATUSES = [
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
  { key: "dropped", label: "Dropped" },
];
const STATUS_LABEL = Object.fromEntries(STATUSES.map((s) => [s.key, s.label]));

const el = (id) => document.getElementById(id);
const form = el("game-form");
const list = el("game-list");
const empty = el("empty");
const summary = el("summary");
const count = el("count");
const submitBtn = el("submit-btn");
const cancelBtn = el("cancel-btn");
const formTitle = el("form-title");

let games = load();
render();

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return []; // ponytail: corrupted JSON → empty, no crash
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
}

function resetForm() {
  form.reset();
  el("game-id").value = "";
  submitBtn.textContent = "Add Game";
  formTitle.textContent = "Add a game";
  cancelBtn.hidden = true;
}

function startEdit(id) {
  const g = games.find((x) => x.id === id);
  if (!g) return;
  el("game-id").value = g.id;
  el("title").value = g.title;
  el("platform").value = g.platform;
  el("format").value = g.format;
  el("status").value = g.status;
  el("note").value = g.note || "";
  submitBtn.textContent = "Save";
  formTitle.textContent = "Edit game";
  cancelBtn.hidden = false;
  el("title").focus();
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteGame(id) {
  games = games.filter((g) => g.id !== id);
  if (el("game-id").value === id) resetForm();
  save();
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const id = el("game-id").value;
  const entry = {
    id: id || crypto.randomUUID(),
    title: el("title").value.trim(),
    platform: el("platform").value.trim(),
    format: el("format").value,
    status: el("status").value,
    note: el("note").value.trim(),
  };
  if (id) {
    const i = games.findIndex((g) => g.id === id);
    games[i] = entry;
  } else {
    games.push(entry);
  }
  save();
  resetForm();
  render();
});

cancelBtn.addEventListener("click", resetForm);

function renderSummary() {
  const counts = Object.fromEntries(STATUSES.map((s) => [s.key, 0]));
  for (const g of games) counts[g.status]++;
  summary.innerHTML = STATUSES.map(
    (s) => `<span class="pill"><span class="dot" style="background:var(--${s.key})"></span>${s.label} <strong>${counts[s.key]}</strong></span>`
  ).join("");
}

function renderList() {
  if (games.length === 0) {
    list.innerHTML = "";
    empty.hidden = false;
    count.textContent = "";
    return;
  }
  empty.hidden = true;
  count.textContent = `${games.length} game${games.length === 1 ? "" : "s"}`;
  list.innerHTML = games
    .map(
      (g) => `
      <li class="game-card">
        <div class="game-top">
          <div>
            <h3 class="game-title">${escape(g.title)}</h3>
            <div class="game-meta">${escape(g.platform)} · ${g.format === "physical" ? "Physical" : "Digital"}</div>
          </div>
          <span class="badge ${g.status}">${STATUS_LABEL[g.status]}</span>
        </div>
        <div class="game-note">${escape(g.note)}</div>
        <div class="game-actions">
          <button class="secondary" data-edit="${g.id}">Edit</button>
          <button class="danger" data-delete="${g.id}">Delete</button>
        </div>
      </li>`
    )
    .join("");
}

// ponytail: event delegation — one listener for the whole list, no per-card binding.
list.addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  if (t.dataset.edit) startEdit(t.dataset.edit);
  else if (t.dataset.delete) deleteGame(t.dataset.delete);
});

function render() {
  renderSummary();
  renderList();
}

function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}
