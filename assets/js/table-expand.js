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
