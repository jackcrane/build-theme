const plotBlocks = Array.from(document.querySelectorAll("[data-plot-block]"));

if (plotBlocks.length > 0) {
  void initializePlots(plotBlocks);
}

async function initializePlots(blocks) {
  const [Plot, dsv] = await Promise.all([importPlotModule(), importDsvModule()]);

  await Promise.all(blocks.map((block) => renderPlotBlock(block, Plot, dsv)));
}

async function importPlotModule() {
  try {
    return await import("https://cdn.jsdelivr.net/npm/@observablehq/plot@0.6/+esm");
  } catch (error) {
    console.error("Failed to load Observable Plot.", error);
    throw error;
  }
}

async function importDsvModule() {
  try {
    return await import("https://cdn.jsdelivr.net/npm/d3-dsv@3/+esm");
  } catch (error) {
    console.error("Failed to load d3-dsv.", error);
    throw error;
  }
}

async function renderPlotBlock(block, Plot, dsv) {
  const mount = block.querySelector("[data-plot-mount]");
  const sourcesNode = block.querySelector(".plot-block__sources");
  const codeNode = block.querySelector(".plot-block__code");
  if (!mount || !sourcesNode || !codeNode) return;

  try {
    const sourceMap = JSON.parse(sourcesNode.textContent || "{}");
    const sourceEntries = await Promise.all(
      Object.entries(sourceMap).map(async ([name, path]) => [name, await fetchSource(path, dsv)])
    );
    const bindings = Object.fromEntries(sourceEntries);
    const plot = await evaluatePlot(codeNode.textContent || "", Plot, bindings);

    if (!(plot instanceof Element)) {
      throw new Error("Plot code must return a DOM element.");
    }

    mount.replaceChildren(plot);
  } catch (error) {
    console.error("Failed to render plot block.", error);
    block.dataset.plotError = "true";
    mount.textContent = formatPlotErrorMessage(error);
  }
}

async function fetchSource(path, dsv) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to fetch plot data from ${path}.`);
  }

  const type = detectSourceType(path, response);

  if (type === "json") {
    return response.json();
  }

  const text = await response.text();

  if (type === "csv") {
    return dsv.csvParse(text, dsv.autoType);
  }

  if (type === "tsv") {
    return dsv.tsvParse(text, dsv.autoType);
  }

  return text;
}

function detectSourceType(path, response) {
  const contentType = response.headers.get("content-type") || "";
  const normalizedPath = path.toLowerCase().split("?")[0].split("#")[0];

  if (contentType.includes("application/json") || normalizedPath.endsWith(".json")) {
    return "json";
  }

  if (contentType.includes("text/csv") || normalizedPath.endsWith(".csv")) {
    return "csv";
  }

  if (
    contentType.includes("text/tab-separated-values") ||
    normalizedPath.endsWith(".tsv")
  ) {
    return "tsv";
  }

  return "text";
}

async function evaluatePlot(source, Plot, bindings) {
  const names = Object.keys(bindings);
  const values = Object.values(bindings);
  const errors = [];

  try {
    const expressionFactory = createPlotFunction(source, names, "expression");
    return await expressionFactory(Plot, ...values);
  } catch (error) {
    errors.push({ mode: "expression", error });
  }

  try {
    const bodyFactory = createPlotFunction(source, names, "body");
    const result = await bodyFactory(Plot, ...values);

    if (result === undefined) {
      throw new Error(
        "Plot code ran, but it did not return anything. If you are using full JavaScript, end the block with `return Plot....plot();`."
      );
    }

    return result;
  } catch (error) {
    errors.push({ mode: "body", error });
  }

  throw buildPlotError(source, errors);
}

function createPlotFunction(source, names, mode) {
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  const trimmedSource = source.trim();
  const body =
    mode === "expression"
      ? `"use strict";\nreturn (\n${trimmedSource.replace(/;+\s*$/, "")}\n);`
      : `"use strict";\n${trimmedSource}`;

  return new AsyncFunction("Plot", ...names, body);
}

function buildPlotError(source, errors) {
  const bodyError = errors.find((entry) => entry.mode === "body")?.error;
  const expressionError = errors.find((entry) => entry.mode === "expression")?.error;
  const primaryError = bodyError || expressionError || new Error("Unknown plot error.");
  const sourcePreview = source
    .trim()
    .split("\n")
    .slice(0, 8)
    .join("\n");
  const hint = getPlotErrorHint(primaryError, source);
  const detail = primaryError?.message ? ` ${primaryError.message}` : "";
  const error = new Error(
    `Plot execution failed.${detail}${hint ? ` ${hint}` : ""}\n\nPlot source:\n${sourcePreview}`
  );

  error.cause = primaryError;
  error.plotErrors = errors;
  return error;
}

function getPlotErrorHint(error, source) {
  if (error instanceof ReferenceError) {
    return "You are referencing a variable that does not exist in this plot block. Define it inside the block or use one of the declared data sources.";
  }

  if (error instanceof SyntaxError) {
    if (!/\breturn\b/.test(source) && /;\s*$/.test(source.trim())) {
      return "A bare plot expression may end with a semicolon, but if you want multiple statements or local variables, use full JavaScript and explicitly `return` the plot.";
    }

    return "Check the JavaScript syntax inside the plot block.";
  }

  if (typeof error?.message === "string" && error.message.includes("did not return anything")) {
    return "Full JavaScript plot blocks must explicitly return the DOM element from `Plot.*(...).plot()`.";
  }

  return "";
}

function formatPlotErrorMessage(error) {
  if (!error?.message) {
    return "Unable to render plot.";
  }

  return `Unable to render plot: ${error.message}`;
}
