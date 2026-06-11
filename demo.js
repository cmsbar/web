/* ── CMSBar demo — a faithful, browser-only simulation ──────────────────────
   No backend. State lives in memory; "Save" mints a version (a pretend PR).   */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const page = $("#page");
const bar = $("#bar");
const barStatus = $("#bar-status");
const barAction = $("#bar-action");
const discardBtn = $('[data-bar="discard"]');
const strip = $("#draft-strip");
const stripCount = $("#strip-count");
const coach = $("#coach");
const chromeNote = $("#chrome-note");
const toast = $("#toast");

const state = {
  mode: "idle", // idle | editing
  pending: 0,
  versions: [
    { n: 207, title: "Autumn timetable", branch: "cms/autumn-9f3a", approved: true, commits: 3, author: "marko", ago: "3d" },
    { n: 205, title: "New teacher bios", branch: "cms/bios-1a2b", approved: false, commits: 1, author: "ana", ago: "5d" },
  ],
  issues: [
    { state: "open", title: "Hero image is soft on mobile", body: "The sourdough photo looks blurry below 400px wide.", author: "ana", ago: "2d" },
  ],
  meta: {
    title: "Little Bakers: Sourdough Club — Crumb & Co.",
    description: "A six-week hands-on sourdough course for kids aged 6–9 in Osijek.",
  },
  launch: "live",
  info: [
    { icon: "📅", label: "Starts", value: "Sept 14" },
    { icon: "⏱️", label: "Schedule", value: "6 weeks · Tue 17:00" },
    { icon: "👶", label: "Ages", value: "6–9" },
    { icon: "💶", label: "Price", value: "€45 / month" },
  ],
};

/* ── tiny helpers ─────────────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1900);
}
function bumpPending(n = 1) {
  if (state.mode !== "editing") return;
  state.pending += n;
  stripCount.hidden = state.pending === 0;
  stripCount.textContent = `${state.pending} unsaved`;
  barAction.textContent = `Save${state.pending ? ` · ${state.pending}` : ""}`;
  barAction.disabled = state.pending === 0;
  if (coach) coach.style.display = "none";
}

/* copy pills */
$$("[data-copy]").forEach((el) =>
  el.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(el.dataset.copy);
      showToast("copied to clipboard");
    } catch {}
  })
);

/* ── draft lifecycle ──────────────────────────────────────────────────────── */
function enterEditing() {
  state.mode = "editing";
  state.pending = 0;
  page.dataset.mode = "editing";
  page.classList.add("editing");
  bar.dataset.state = "editing";
  barStatus.textContent = "Draft: Sourdough course";
  barStatus.classList.remove("cb-pill-live");
  barStatus.classList.add("cb-pill-draft");
  barAction.textContent = "Save";
  barAction.disabled = true;
  discardBtn.hidden = false;
  strip.hidden = false;
  stripCount.hidden = true;
  chromeNote.innerHTML = "draft <b>cms/sourdough-7c1d</b>";
  if (coach) coach.innerHTML = "everything outlined is editable — click text, the image, or <b>+ Add row</b>";
  enableTextEditing(true);
}

function exitEditing(discarded) {
  state.mode = "idle";
  state.pending = 0;
  page.dataset.mode = "idle";
  page.classList.remove("editing");
  bar.dataset.state = "idle";
  barStatus.textContent = "Live site";
  barStatus.classList.add("cb-pill-live");
  barStatus.classList.remove("cb-pill-draft");
  barAction.textContent = "New draft";
  barAction.disabled = false;
  discardBtn.hidden = true;
  strip.hidden = true;
  chromeNote.innerHTML = "logged in as <b>editor</b>";
  enableTextEditing(false);
  hideToolbar();
  if (coach) {
    coach.style.display = "";
    coach.innerHTML = '<span class="coach-arrow">↑</span> click <b>New draft</b> to make the page editable';
  }
  if (discarded) showToast("draft discarded");
}

function save() {
  if (state.pending === 0) return;
  const n = (state.versions[0]?.n ?? 207) + 7;
  state.versions.unshift({
    n, title: "Sourdough course", branch: "cms/sourdough-7c1d",
    approved: false, commits: 1, author: "editor", ago: "just now",
  });
  state.pending = 0;
  stripCount.hidden = true;
  barAction.textContent = "Save";
  barAction.disabled = true;
  showToast(`saved — PR #${n} opened`);
  chromeNote.innerHTML = `PR <b>#${n}</b> open`;
}

barAction.addEventListener("click", () => {
  if (state.mode === "idle") enterEditing();
  else if (!barAction.disabled) save();
});
discardBtn.addEventListener("click", () => {
  if (state.pending === 0 || confirm("Discard pending changes and exit this draft?")) {
    exitEditing(true);
  }
});

/* ── text editing + floating toolbar ──────────────────────────────────────── */
const toolbar = $("#rt-toolbar");
let activeEditable = null;

function editableTextNodes() {
  return $$("[data-path]", page).filter(
    (el) => !el.matches(".course-hero-img, .media-slot") && !el.closest("[data-repeater]")
  );
}

function enableTextEditing(on) {
  editableTextNodes().forEach((el) => {
    if (on) {
      el.setAttribute("contenteditable", "true");
      el.spellcheck = false;
    } else {
      el.removeAttribute("contenteditable");
    }
  });
}

let editingSnapshot = "";
page.addEventListener("focusin", (e) => {
  const el = e.target.closest('[contenteditable="true"][data-path]');
  if (!el || el.closest("[data-repeater]")) return;
  activeEditable = el;
  editingSnapshot = el.innerHTML;
  positionToolbar(el);
});
page.addEventListener("focusout", (e) => {
  const el = e.target.closest('[contenteditable="true"][data-path]');
  if (!el) return;
  if (el.innerHTML !== editingSnapshot) bumpPending();
  setTimeout(() => {
    if (!document.activeElement?.closest("#rt-toolbar")) hideToolbar();
  }, 150);
});
page.addEventListener("keydown", (e) => {
  const el = e.target.closest('[contenteditable="true"][data-path]');
  if (el && e.key === "Enter" && !el.dataset.rich) {
    e.preventDefault();
    el.blur();
  }
});

function positionToolbar(el) {
  const r = el.getBoundingClientRect();
  toolbar.hidden = false;
  toolbar.style.left = `${r.left + r.width / 2}px`;
  toolbar.style.top = `${r.top - 8}px`;
}
function hideToolbar() {
  toolbar.hidden = true;
}
toolbar.addEventListener("mousedown", (e) => e.preventDefault());
toolbar.addEventListener("click", (e) => {
  const b = e.target.closest("[data-rt]");
  if (!b || !activeEditable) return;
  const cmd = b.dataset.rt;
  activeEditable.focus();
  if (cmd === "bold") document.execCommand("bold");
  else if (cmd === "italic") document.execCommand("italic");
  else if (cmd === "underline") document.execCommand("underline");
  else if (cmd === "hand") wrapSelection("font-hand");
  else if (cmd === "link") {
    const url = prompt("Link URL:", "https://");
    if (url) document.execCommand("createLink", false, url);
  }
  bumpPending();
});

function wrapSelection(cls) {
  const sel = window.getSelection();
  if (!sel.rangeCount || sel.isCollapsed) return;
  const span = document.createElement("span");
  span.className = cls;
  try {
    span.appendChild(sel.getRangeAt(0).extractContents());
    sel.getRangeAt(0).insertNode(span);
  } catch {}
}

/* ── image: change + reposition ───────────────────────────────────────────── */
const heroImg = $("#hero-img");

heroImg.addEventListener("click", (e) => {
  if (state.mode !== "editing") return;
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "change") openMedia((url) => {
    heroImg.style.backgroundImage = `url('${url}')`;
    bumpPending();
    showToast("image changed");
  }, "image");
  else if (act === "reposition") startReposition();
});

function startReposition() {
  if (heroImg.classList.contains("repositioning")) return; // already active
  const hint = $(".reposition-hint", heroImg);
  heroImg.classList.add("repositioning");
  hint.hidden = false;
  hint.textContent = "drag to reposition · click ✓ when done";
  const move = (ev) => {
    const r = heroImg.getBoundingClientRect();
    const cx = (ev.touches?.[0]?.clientX ?? ev.clientX) - r.left;
    const cy = (ev.touches?.[0]?.clientY ?? ev.clientY) - r.top;
    const px = Math.max(0, Math.min(100, (cx / r.width) * 100));
    const py = Math.max(0, Math.min(100, (cy / r.height) * 100));
    heroImg.style.backgroundPosition = `${px}% ${py}%`;
  };
  const down = (ev) => { heroImg.classList.add("dragging"); move(ev); window.addEventListener("mousemove", move); };
  const up = () => { heroImg.classList.remove("dragging"); window.removeEventListener("mousemove", move); };
  heroImg.addEventListener("mousedown", down);
  window.addEventListener("mouseup", up);
  const done = (ev) => {
    if (ev.target.closest(".reposition-hint")) {
      heroImg.classList.remove("repositioning");
      hint.hidden = true;
      heroImg.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
      hint.removeEventListener("click", done);
      bumpPending();
      showToast("position saved");
    }
  };
  hint.textContent = "drag to reposition · click here when done ✓";
  hint.addEventListener("click", done);
}

/* ── media browser modal ──────────────────────────────────────────────────── */
const mediaModal = $("#media-modal");
const LIBRARY = [
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&q=70",
  "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=400&q=70",
  "https://images.unsplash.com/photo-1486427944299-d1955d23e34d?w=400&q=70",
  "https://images.unsplash.com/photo-1517433670267-08bbd4be890f?w=400&q=70",
  "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&q=70",
  "https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=400&q=70",
];
let mediaPick = null;

function openMedia(onPick, _kind) {
  mediaPick = onPick;
  mediaModal.hidden = false;
  switchTab("library");
  renderMediaGrid();
}
function renderMediaGrid() {
  const grid = $("#media-grid");
  grid.innerHTML =
    `<div class="media-tile up" data-up><span style="font-size:22px">⬆</span><span>Upload</span></div>` +
    LIBRARY.map(
      (u) => `<div class="media-tile" style="background-image:url('${u}')" data-url="${u}">
        <span class="mt-name">${u.split("/").pop().slice(0, 18)}…</span></div>`
    ).join("");
  $$(".media-tile", grid).forEach((t) =>
    t.addEventListener("click", () => {
      if (t.dataset.up) return switchTab("upload");
      mediaPick?.(t.dataset.url);
      closeMedia();
    })
  );
}
function switchTab(name) {
  $$(".mtab", mediaModal).forEach((b) => b.classList.toggle("active", b.dataset.mtab === name));
  $$(".mpane", mediaModal).forEach((p) => (p.hidden = p.dataset.mpane !== name));
}
function closeMedia() {
  mediaModal.hidden = true;
  $("#upload-preview").hidden = true;
  $("#embed-preview").hidden = true;
  $("#embed-status").textContent = "";
  $("#embed-input").value = "";
}
$$(".mtab", mediaModal).forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.mtab)));

/* upload */
const uploadInput = $("#upload-input");
const uploadDrop = $("#upload-drop");
uploadInput.addEventListener("change", () => handleUpload(uploadInput.files[0]));
["dragover", "dragenter"].forEach((ev) =>
  uploadDrop.addEventListener(ev, (e) => { e.preventDefault(); uploadDrop.classList.add("over"); })
);
["dragleave", "drop"].forEach((ev) =>
  uploadDrop.addEventListener(ev, (e) => { e.preventDefault(); uploadDrop.classList.remove("over"); })
);
uploadDrop.addEventListener("drop", (e) => handleUpload(e.dataTransfer.files[0]));
function handleUpload(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const prev = $("#upload-preview");
  prev.hidden = false;
  const isVid = file.type.startsWith("video");
  prev.innerHTML = `${isVid ? `<video src="${url}" controls></video>` : `<img src="${url}" alt="">`}
    <button class="btn btn-accent" style="margin-top:12px" id="use-upload">Use this ${isVid ? "video" : "image"}</button>`;
  $("#use-upload").addEventListener("click", () => {
    mediaPick?.(url, isVid ? "video" : "image");
    closeMedia();
    showToast("upload staged for next Save");
  });
}

/* embed */
$("#embed-go").addEventListener("click", runEmbed);
$("#embed-input").addEventListener("keydown", (e) => { if (e.key === "Enter") runEmbed(); });
function toEmbedUrl(raw) {
  try {
    const u = new URL(raw.trim());
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtube.com" && u.searchParams.get("v"))
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    if (h === "youtu.be") return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    if (h === "vimeo.com") return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean)[0]}`;
    if (h.includes("google") && /maps/.test(u.pathname)) {
      const m = (u.pathname + u.search).match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (m) return `https://maps.google.com/maps?q=${m[1]},${m[2]}&z=15&output=embed`;
      return `https://maps.google.com/maps?q=${encodeURIComponent(raw)}&output=embed`;
    }
  } catch {}
  return null;
}
function runEmbed() {
  const raw = $("#embed-input").value;
  const status = $("#embed-status");
  const embed = toEmbedUrl(raw);
  if (!embed) {
    status.className = "embed-status err";
    status.textContent = "Couldn't read that — try a YouTube, Vimeo or Google Maps URL.";
    return;
  }
  status.className = "embed-status ok";
  status.textContent = "Looks good. Preview below.";
  const prev = $("#embed-preview");
  prev.hidden = false;
  prev.innerHTML = `<iframe src="${embed}" allowfullscreen></iframe>
    <button class="btn btn-accent" style="margin-top:12px" id="use-embed">Use this embed</button>`;
  $("#use-embed").addEventListener("click", () => {
    mediaPick?.(embed, "embed");
    closeMedia();
    showToast("media embedded");
  });
}

/* the media slot on the page opens the modal in embed mode */
$("#media-slot").addEventListener("click", (e) => {
  if (state.mode !== "editing") return;
  if (!e.target.closest('[data-act="embed"]') && !e.target.closest(".media-placeholder")) return;
  openMedia((url, kind) => {
    const slot = $("#media-slot");
    if (kind === "video") slot.innerHTML = `<video src="${url}" controls></video>`;
    else if (kind === "embed") slot.innerHTML = `<iframe src="${url}" allowfullscreen></iframe>`;
    else slot.innerHTML = `<img src="${url}" alt="" style="width:100%;display:block">`;
    bumpPending();
  });
  switchTab("embed");
});

/* ── info-list repeater (the "Informacije" block) ─────────────────────────── */
const ICONS = ["📅", "⏱️", "👶", "💶", "📍", "✏️", "⭐", "📞", "✉️", "🎒", "🧁", "🍞"];
const infoList = $("#info-list");
const infoAdd = $(".info-add");

function renderInfo() {
  infoList.innerHTML = state.info
    .map(
      (row, i) => `<li class="info-row" data-i="${i}" draggable="false">
        <span class="ir-handle" title="Drag to reorder" data-handle>⠿</span>
        <span class="ir-icon" data-icon role="button" title="Change icon">${row.icon}</span>
        <span class="ir-label" data-f="label">${row.label}</span>
        <span class="ir-value" data-f="value">${row.value}</span>
        <button class="ir-del" data-del title="Remove row">✕</button>
      </li>`
    )
    .join("");
  if (state.mode === "editing") wireInfoEditing();
}

function wireInfoEditing() {
  $$(".info-row", infoList).forEach((li) => {
    const i = +li.dataset.i;
    $$("[data-f]", li).forEach((cell) => {
      cell.setAttribute("contenteditable", "true");
      cell.spellcheck = false;
      cell.addEventListener("blur", () => {
        const v = cell.textContent.trim();
        if (state.info[i][cell.dataset.f] !== v) {
          state.info[i][cell.dataset.f] = v;
          bumpPending();
        }
      });
      cell.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); cell.blur(); } });
    });
    $("[data-del]", li).addEventListener("click", () => {
      state.info.splice(i, 1);
      renderInfo();
      bumpPending();
    });
    $("[data-icon]", li).addEventListener("click", (e) => openIconPicker(e.currentTarget, i));
    // drag reorder
    const handle = $("[data-handle]", li);
    handle.addEventListener("mousedown", () => (li.draggable = true));
    li.addEventListener("dragstart", (e) => { li.classList.add("dragging"); e.dataTransfer.setData("i", String(i)); });
    li.addEventListener("dragend", () => { li.classList.remove("dragging"); li.draggable = false; $$(".info-row").forEach((r) => r.classList.remove("drop-target")); });
    li.addEventListener("dragover", (e) => { e.preventDefault(); li.classList.add("drop-target"); });
    li.addEventListener("dragleave", () => li.classList.remove("drop-target"));
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const from = +e.dataTransfer.getData("i");
      const to = i;
      if (from === to) return;
      const [moved] = state.info.splice(from, 1);
      state.info.splice(to, 0, moved);
      renderInfo();
      bumpPending();
    });
  });
}

infoAdd.addEventListener("click", () => {
  state.info.push({ icon: "✏️", label: "New field", value: "Value" });
  renderInfo();
  bumpPending();
});

const iconPop = $("#icon-pop");
function openIconPicker(anchor, i) {
  iconPop.innerHTML = ICONS.map((ic) => `<button data-ic="${ic}">${ic}</button>`).join("");
  const r = anchor.getBoundingClientRect();
  iconPop.style.left = `${r.left}px`;
  iconPop.style.top = `${r.bottom + 6}px`;
  iconPop.hidden = false;
  $$("button", iconPop).forEach((b) =>
    b.addEventListener("click", () => {
      state.info[i].icon = b.dataset.ic;
      iconPop.hidden = true;
      renderInfo();
      bumpPending();
    })
  );
}
document.addEventListener("click", (e) => {
  if (!iconPop.hidden && !e.target.closest("#icon-pop") && !e.target.closest("[data-icon]")) iconPop.hidden = true;
});

/* ── drawers: versions / issues / meta / settings ─────────────────────────── */
const drawerScrim = $("#drawer-scrim");
const drawerTitle = $("#drawer-title");
const drawerBody = $("#drawer-body");

function openDrawer(title, html) {
  drawerTitle.textContent = title;
  drawerBody.innerHTML = html;
  drawerScrim.hidden = false;
  return drawerBody;
}
function closeDrawer() { drawerScrim.hidden = true; }

$$('[data-bar]').forEach((b) =>
  b.addEventListener("click", () => {
    const k = b.dataset.bar;
    if (k === "versions") openVersions();
    else if (k === "issues") openIssues();
    else if (k === "meta") openMeta();
    else if (k === "settings") openSettings();
    else if (k === "shared") {
      page.classList.toggle("show-shared");
      b.classList.toggle("cb-btn-accent", page.classList.contains("show-shared"));
    }
  })
);

function openVersions() {
  const html = state.versions
    .map(
      (v) => `<div class="ver ${v.author === "editor" ? "active" : ""}">
        <div class="ver-top">
          <span class="ver-title">${v.title}</span>
          <span class="ver-badge ${v.approved ? "approved" : "open"}">${v.approved ? "approved" : "open"}</span>
        </div>
        <div class="ver-meta">${v.branch} · #${v.n} · ${v.commits} commit${v.commits > 1 ? "s" : ""} · ${v.author} · ${v.ago}</div>
        <div class="ver-actions">
          <button>Preview</button><button>Edit this version</button><button>Fork</button>
        </div>
      </div>`
    )
    .join("");
  const body = openDrawer("Versions", html || "<p style='color:var(--faint)'>No open drafts.</p>");
  $$("button", body).forEach((b) => b.addEventListener("click", () => showToast(`${b.textContent} (demo)`)));
}

function openIssues() {
  const list = state.issues
    .map(
      (i) => `<div class="issue">
        <div class="issue-h"><span class="issue-state">${i.state}</span><span class="issue-title">${i.title}</span></div>
        <p class="issue-body">${i.body}</p>
        <div class="issue-meta">@${i.author} · ${i.ago}</div>
      </div>`
    )
    .join("");
  const body = openDrawer(
    "Issues",
    `<form class="issue-form" id="issue-form">
      <input type="text" id="issue-title" placeholder="Short title (e.g. Typo in price)" />
      <textarea id="issue-body" placeholder="What's wrong, and on which element?"></textarea>
      <button class="btn btn-accent" type="submit">File issue → GitHub</button>
    </form>${list}`
  );
  $("#issue-form", body).addEventListener("submit", (e) => {
    e.preventDefault();
    const t = $("#issue-title", body).value.trim();
    if (!t) return;
    state.issues.unshift({ state: "open", title: t, body: $("#issue-body", body).value.trim() || "(no description)", author: "editor", ago: "just now" });
    openIssues();
    showToast("issue filed (demo)");
  });
}

function openMeta() {
  const body = openDrawer(
    "Page meta (SEO)",
    `<div class="field"><label>Title tag</label><input id="m-title" value="${state.meta.title.replace(/"/g, "&quot;")}"></div>
     <div class="field"><label>Meta description</label><textarea id="m-desc">${state.meta.description}</textarea></div>
     <div class="serp">
       <div class="serp-title" id="p-title">${state.meta.title}</div>
       <div class="serp-url">crumb&co.example.com › courses › sourdough</div>
       <div class="serp-desc" id="p-desc">${state.meta.description}</div>
     </div>`
  );
  const sync = () => {
    state.meta.title = $("#m-title", body).value;
    state.meta.description = $("#m-desc", body).value;
    $("#p-title", body).textContent = state.meta.title;
    $("#p-desc", body).textContent = state.meta.description;
    bumpPending();
  };
  $("#m-title", body).addEventListener("input", sync);
  $("#m-desc", body).addEventListener("input", sync);
}

function openSettings() {
  const opt = (val, title, sub) =>
    `<div class="seg-opt ${state.launch === val ? "on" : ""}" data-launch="${val}">
      <div><div class="so-title">${title}</div><div class="so-sub">${sub}</div></div>
    </div>`;
  const body = openDrawer(
    "Settings",
    `<h4 style="margin:0 0 10px;font-size:13px;color:var(--dim)">🚀 Site launch</h4>
     ${opt("teaser", "Teaser", "Public sees a teaser; only editors see the site.")}
     ${opt("live", "Live", "The whole site is visible to everyone.")}`
  );
  $$("[data-launch]", body).forEach((o) =>
    o.addEventListener("click", () => {
      state.launch = o.dataset.launch;
      $$("[data-launch]", body).forEach((x) => x.classList.toggle("on", x === o));
      bumpPending();
    })
  );
}

/* ── global close handlers ────────────────────────────────────────────────── */
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) { closeMedia(); closeDrawer(); }
  if (e.target === mediaModal) closeMedia();
  if (e.target === drawerScrim) closeDrawer();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeMedia(); closeDrawer(); iconPop.hidden = true; hideToolbar(); }
});
window.addEventListener("scroll", () => { if (!toolbar.hidden && activeEditable) positionToolbar(activeEditable); }, { passive: true });

/* ── init ─────────────────────────────────────────────────────────────────── */
renderInfo();
