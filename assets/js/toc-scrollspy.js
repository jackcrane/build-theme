(() => {
  const toc = document.querySelector("[data-scrollspy-toc]");
  if (!toc) return;

  const linkEntries = Array.from(toc.querySelectorAll('a[href^="#"]'))
    .map((link) => {
      const href = link.getAttribute("href");
      if (!href || href === "#") return null;

      const id = decodeURIComponent(href.slice(1));
      const section = document.getElementById(id);
      if (!section) return null;

      return {
        id,
        link,
        item: link.closest("li"),
        section,
      };
    })
    .filter(Boolean);

  if (linkEntries.length === 0) return;

  let activeId = "";
  let ticking = false;

  function setActive(id) {
    if (!id || id === activeId) return;

    activeId = id;

    linkEntries.forEach(({ id: entryId, link, item }) => {
      const isActive = entryId === id;
      link.classList.toggle("is-active", isActive);
      item?.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateActiveLink() {
    let currentId = linkEntries[0].id;

    for (const entry of linkEntries) {
      const top = entry.section.getBoundingClientRect().top;

      if (top <= 0) {
        currentId = entry.id;
      } else {
        break;
      }
    }

    setActive(currentId);
    ticking = false;
  }

  function requestUpdate() {
    if (ticking) return;

    ticking = true;
    window.requestAnimationFrame(updateActiveLink);
  }

  document.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  window.addEventListener("load", requestUpdate);
  window.addEventListener("hashchange", requestUpdate);

  requestUpdate();
})();
