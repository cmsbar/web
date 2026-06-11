// Docs: copy pills + scroll-spy active sidebar link.
const toast = document.getElementById("toast");
let t = null;
document.querySelectorAll("[data-copy]").forEach((el) =>
  el.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(el.dataset.copy);
      toast.classList.add("show");
      clearTimeout(t);
      t = setTimeout(() => toast.classList.remove("show"), 1800);
    } catch {}
  })
);

const links = [...document.querySelectorAll(".docs-nav a")];
const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        links.forEach((l) => l.classList.remove("active"));
        map.get(e.target.id)?.classList.add("active");
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);
document.querySelectorAll(".docs-main section[id]").forEach((s) => spy.observe(s));
