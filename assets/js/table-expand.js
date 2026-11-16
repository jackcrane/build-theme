document.addEventListener("click", (event) => {
  const button = event.target.closest(".table-expand__button");
  if (!button) return;

  const row = button.closest("tr");
  const table = row.closest("table");
  const level = row.dataset.expandTrigger;

  row.remove();
  table
    .querySelectorAll(`tr[data-expand-level="${level}"]`)
    .forEach((hidden) => hidden.removeAttribute("hidden"));
});

function initTablePagination(table) {
  const size = parseInt(table.dataset.paginate, 10);
  const rows = [...table.querySelectorAll("tr[data-page]")];
  const pages = Math.ceil(rows.length / size);
  if (pages < 2) return;

  const columns = table.querySelector("tr").children.length;
  const nav = document.createElement("td");
  nav.colSpan = columns;
  const footer = document.createElement("tfoot");
  const footerRow = document.createElement("tr");
  footerRow.className = "table-pagination";
  footerRow.append(nav);
  footer.append(footerRow);
  table.append(footer);

  const makeButton = (label, page, current) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "table-pagination__button";
    button.textContent = label;
    if (current) button.setAttribute("aria-current", "page");
    button.addEventListener("click", () => show(page));
    return button;
  };

  function show(page) {
    rows.forEach((row) => {
      row.hidden = Number(row.dataset.page) !== page;
    });
    nav.replaceChildren();
    if (page > 1) nav.append(makeButton("Prev", page - 1));
    let previous = 0;
    for (let i = 1; i <= pages; i++) {
      if (i !== 1 && i !== pages && Math.abs(i - page) > 1) continue;
      if (i - previous > 1) {
        const gap = document.createElement("span");
        gap.className = "table-pagination__gap";
        gap.textContent = "…";
        nav.append(gap);
      }
      nav.append(makeButton(i, i, i === page));
      previous = i;
    }
    if (page < pages) nav.append(makeButton("Next", page + 1));
  }

  show(1);
}

document.querySelectorAll("table[data-paginate]").forEach(initTablePagination);
