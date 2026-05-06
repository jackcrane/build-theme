const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 8;

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("[data-site-search]");

  if (!root || typeof window.lunr === "undefined") {
    return;
  }

  const input = root.querySelector(".site-search__input");
  const status = root.querySelector("[data-search-status]");
  const results = root.querySelector("[data-search-results]");
  const modal = root.querySelector(".site-search__modal");
  const backdrop = root.querySelector(".site-search__backdrop");
  const searchUrl = root.dataset.searchUrl;
  const baseUrl = (root.dataset.baseUrl || "").replace(/\/$/, "");
  const openButtons = document.querySelectorAll("[data-search-trigger]");
  const closeButtons = root.querySelectorAll("[data-search-close]");

  let documents = [];
  let documentsById = new Map();
  let index = null;
  let ready = false;
  let loadError = false;
  let lastFocusedElement = null;
  let activeResultIndex = -1;

  fetch(searchUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${searchUrl}`);
      }

      return response.json();
    })
    .then((payload) => {
      documents = payload.map((doc, position) => ({ ...doc, indexId: String(position) }));
      documentsById = new Map(documents.map((doc) => [doc.indexId, doc]));
      index = window.lunr(function () {
        this.ref("indexId");
        this.field("title", { boost: 10 });
        this.field("description", { boost: 4 });
        this.field("author", { boost: 2 });
        this.field("content");

        documents.forEach((doc) => this.add(doc));
      });
      ready = true;
      runSearch();
    })
    .catch(() => {
      loadError = true;
      setStatus("Search is unavailable right now.");
    });

  input.addEventListener("input", runSearch);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveActiveResult(1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveActiveResult(-1);
      return;
    }

    if (event.key === "Enter") {
      const activeResult = getResultLinks()[activeResultIndex];

      if (activeResult) {
        event.preventDefault();
        activeResult.click();
      }
    }
  });

  openButtons.forEach((button) => {
    button.addEventListener("click", () => openModal(button));
  });

  closeButtons.forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    const usesShortcut = event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey);

    if (usesShortcut) {
      event.preventDefault();
      openModal(document.activeElement);
      return;
    }

    if (event.key === "Escape" && root.dataset.searchOpen === "true") {
      closeModal();
    }
  });

  function runSearch() {
    const query = input.value.trim();

    if (loadError) {
      hideResults();
      return;
    }

    if (!ready) {
      if (query.length >= MIN_QUERY_LENGTH) {
        setStatus("Loading search index…");
      } else {
        hideStatus();
      }
      hideResults();
      return;
    }

    if (query.length < MIN_QUERY_LENGTH) {
      hideStatus();
      hideResults();
      return;
    }

    const searchTerms = query
      .split(/\s+/)
      .map((term) => term.replace(/[^\p{L}\p{N}]/gu, ""))
      .filter(Boolean);

    if (searchTerms.length === 0) {
      hideStatus();
      hideResults();
      return;
    }

    let matches = [];

    try {
      matches = searchDocuments(searchTerms);
    } catch {
      setStatus(`No matches for "${query}".`);
      hideResults();
      return;
    }

    if (matches.length === 0) {
      setStatus(`No matches for "${query}".`);
      renderResults([]);
      return;
    }

    hideStatus();
    renderResults(matches, searchTerms);
  }

  function renderResults(matches, terms) {
    if (matches.length === 0) {
      root.dataset.hasResults = "false";
      activeResultIndex = -1;
      results.hidden = true;
      results.innerHTML = "";
      return;
    }

    root.dataset.hasResults = "true";
    results.hidden = false;
    results.innerHTML = matches
      .map((doc, resultIndex) => {
        const preview = buildPreview(doc, terms);

        return `
          <a
            class="site-search__result"
            href="${baseUrl}${doc.url}"
            data-search-result
            data-result-index="${resultIndex}"
          >
            <h3 class="site-search__title">${escapeHtml(doc.title)}</h3>
            <p class="site-search__description">${preview}</p>
          </a>
        `;
      })
      .join("");

    activeResultIndex = -1;
    updateActiveResult();
  }

  function hideResults() {
    root.dataset.hasResults = "false";
    activeResultIndex = -1;
    results.hidden = true;
    results.innerHTML = "";
  }

  function openModal(trigger) {
    lastFocusedElement = trigger instanceof HTMLElement ? trigger : document.activeElement;
    root.dataset.searchOpen = "true";
    modal.hidden = false;
    backdrop.hidden = false;
    document.body.style.overflow = "hidden";

    window.requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function closeModal() {
    root.dataset.searchOpen = "false";
    activeResultIndex = -1;
    modal.hidden = true;
    backdrop.hidden = true;
    document.body.style.overflow = "";

    if (lastFocusedElement instanceof HTMLElement) {
      lastFocusedElement.focus();
    }
  }

  function setStatus(message) {
    status.hidden = false;
    status.textContent = message;
  }

  function hideStatus() {
    status.hidden = true;
    status.textContent = "";
  }

  function moveActiveResult(direction) {
    const resultLinks = getResultLinks();

    if (resultLinks.length === 0) {
      return;
    }

    activeResultIndex =
      activeResultIndex < 0
        ? direction > 0
          ? 0
          : resultLinks.length - 1
        : (activeResultIndex + direction + resultLinks.length) % resultLinks.length;

    updateActiveResult();
  }

  function updateActiveResult() {
    getResultLinks().forEach((link, linkIndex) => {
      const isActive = linkIndex === activeResultIndex;

      link.dataset.active = isActive ? "true" : "false";
      if (isActive) {
        link.scrollIntoView({ block: "nearest" });
      }
    });
  }

  function getResultLinks() {
    return Array.from(results.querySelectorAll("[data-search-result]"));
  }

  function searchDocuments(terms) {
    const strictMatches = collectMatches((query) => {
      terms.forEach((term) => {
        query.term(term, {
          presence: window.lunr.Query.presence.REQUIRED,
        });
      });
    });

    if (strictMatches.length > 0) {
      return strictMatches;
    }

    return collectMatches((query) => {
      terms.forEach((term) => {
        query.term(term, {
          wildcard: window.lunr.Query.wildcard.TRAILING,
        });
      });
    });
  }

  function collectMatches(buildQuery) {
    return index
      .query(buildQuery)
      .slice(0, MAX_RESULTS)
      .map((match) => documentsById.get(match.ref))
      .filter(Boolean);
  }

  function buildPreview(doc, terms) {
    const preview = findPreviewSnippet(doc.content || "", terms);

    if (preview) {
      return highlightTerms(preview.text, terms, {
        prefix: preview.prefix,
        suffix: preview.suffix,
      });
    }

    return escapeHtml(truncate(doc.description || doc.content || "", 160));
  }

  function findPreviewSnippet(content, terms) {
    const normalized = content.trim();

    if (!normalized) {
      return null;
    }

    const matchIndex = findFirstMatchIndex(normalized, terms);

    if (matchIndex < 0) {
      return null;
    }

    const snippetRadius = 80;
    let start = Math.max(0, matchIndex - snippetRadius);
    let end = Math.min(normalized.length, matchIndex + snippetRadius);

    if (start > 0) {
      const nextBoundary = normalized.indexOf(" ", start);
      if (nextBoundary >= 0 && nextBoundary < matchIndex) {
        start = nextBoundary + 1;
      }
    }

    if (end < normalized.length) {
      const prevBoundary = normalized.lastIndexOf(" ", end);
      if (prevBoundary > matchIndex) {
        end = prevBoundary;
      }
    }

    const text = truncate(normalized.slice(start, end).trim(), 160);

    if (!text) {
      return null;
    }

    return {
      text,
      prefix: start > 0,
      suffix: end < normalized.length,
    };
  }

  function findFirstMatchIndex(content, terms) {
    return terms.reduce((bestIndex, term) => {
      const index = content.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());

      if (index < 0) {
        return bestIndex;
      }

      if (bestIndex < 0 || index < bestIndex) {
        return index;
      }

      return bestIndex;
    }, -1);
  }

  function highlightTerms(value, terms, { prefix = false, suffix = false } = {}) {
    const escapedTerms = Array.from(new Set(terms))
      .filter(Boolean)
      .sort((left, right) => right.length - left.length)
      .map(escapeRegExp);

    const escapedValue = escapeHtml(value);
    const highlightedValue =
      escapedTerms.length === 0
        ? escapedValue
        : escapedValue.replace(
            new RegExp(`(${escapedTerms.join("|")})`, "giu"),
            "<mark>$1</mark>",
          );

    return `${prefix ? "&hellip;" : ""}${highlightedValue}${suffix ? "&hellip;" : ""}`;
  }

  function truncate(value, maxLength) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength).trimEnd()}…`;
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
});
