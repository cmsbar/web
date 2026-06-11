// ── CMSBar landing — interactions ──────────────────────────────────────────

// Scroll reveals
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
);
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

// Copy-to-clipboard pills
const toast = document.getElementById("toast");
let toastTimer = null;
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
    } catch {
      /* clipboard blocked - ignore */
    }
  });
});

// Hero editable word — a small wink that foreshadows the demo
const heroWord = document.getElementById("hero-edit");
heroWord.setAttribute("contenteditable", "true");
heroWord.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    heroWord.blur();
    document.getElementById("demo").scrollIntoView({ behavior: "smooth" });
  }
});

// ── The demo state machine ──────────────────────────────────────────────────
// idle → editing → saved(PR open) → merged
const bar = document.getElementById("cmsbar");
const browserBody = document.getElementById("browser-body");
const status = document.getElementById("cb-status");
const action = document.getElementById("cb-action");
const headline = document.getElementById("demo-headline");
const coach = document.getElementById("demo-coach");
const chromeNote = document.getElementById("chrome-note");

const prPanel = document.getElementById("pr-panel");
const prEmpty = document.getElementById("pr-empty");
const prCard = document.getElementById("pr-card");
const prState = document.getElementById("pr-state");
const btnMerge = document.getElementById("btn-merge");
const prApproved = document.getElementById("pr-approved");
const prDeployed = document.getElementById("pr-deployed");
const diffOld = document.getElementById("diff-old");
const diffNew = document.getElementById("diff-new");

const ORIGINAL = headline.textContent.trim();
let state = "idle";
let pendingBadge = null;

function setPending(n) {
  if (!pendingBadge) {
    pendingBadge = document.createElement("span");
    pendingBadge.className = "cb-count";
    status.appendChild(pendingBadge);
  }
  pendingBadge.textContent = `${n} unsaved`;
  pendingBadge.style.display = n > 0 ? "" : "none";
}

function enterEditing() {
  state = "editing";
  bar.dataset.state = "editing";
  browserBody.classList.add("editing");
  headline.setAttribute("contenteditable", "true");
  status.textContent = "Draft: Homepage";
  status.classList.remove("cb-pill-live");
  status.classList.add("cb-pill-draft");
  action.textContent = "Save";
  action.disabled = true;
  coach.innerHTML = "click the <b>headline</b> and type — then hit <b>Save</b>";
  chromeNote.innerHTML = "draft <b>cms/homepage-3f2a91</b>";
  setPending(0);
  headline.focus();
  // place caret at end
  const r = document.createRange();
  r.selectNodeContents(headline);
  r.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(r);
}

headline.addEventListener("input", () => {
  if (state !== "editing") return;
  const changed = headline.textContent.trim() !== ORIGINAL;
  action.disabled = !changed;
  setPending(changed ? 1 : 0);
  if (changed) coach.style.display = "none";
});
headline.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    headline.blur();
  }
});

function save() {
  const newText = headline.textContent.trim() || ORIGINAL;
  state = "saved";
  action.textContent = "Saving…";
  action.disabled = true;

  setTimeout(() => {
    action.textContent = "Saved ✓";
    setPending(0);
    headline.setAttribute("contenteditable", "false");
    browserBody.classList.remove("editing");

    diffOld.textContent = `- "headline": "${ORIGINAL}"`;
    diffNew.textContent = `+ "headline": "${newText}"`;
    prEmpty.hidden = true;
    prCard.hidden = false;
    prPanel.dataset.state = "open";
    coach.style.display = "none";
    chromeNote.innerHTML = "PR <b>#214</b> open";
  }, 650);
}

btnMerge.addEventListener("click", () => {
  if (state !== "saved") return;
  state = "merged";
  prState.textContent = "Merged";
  prState.classList.add("merged");
  btnMerge.disabled = true;
  btnMerge.style.opacity = "0.4";
  prApproved.hidden = false;
  prDeployed.hidden = false;
  status.textContent = "Live site";
  status.classList.add("cb-pill-live");
  status.classList.remove("cb-pill-draft");
  if (pendingBadge) pendingBadge.style.display = "none";
  action.textContent = "New draft";
  action.disabled = false;
  chromeNote.innerHTML = "deployed <b>just now</b>";
});

action.addEventListener("click", () => {
  if (state === "idle" || state === "merged") {
    // reset for replay
    if (state === "merged") {
      prState.textContent = "Open";
      prState.classList.remove("merged");
      btnMerge.disabled = false;
      btnMerge.style.opacity = "";
      prApproved.hidden = true;
      prDeployed.hidden = true;
      prEmpty.hidden = false;
      prCard.hidden = true;
      prPanel.dataset.state = "empty";
    }
    enterEditing();
  } else if (state === "editing" && !action.disabled) {
    save();
  }
});
