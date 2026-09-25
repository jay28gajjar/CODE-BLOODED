import { c as createRoot, j as jsxRuntimeExports, r as reactExports } from './client-B0hW2Wui.js';

const getRiskColor = (level) => {
  switch (level) {
    case "LOW":
      return "text-low bg-low";
    case "UNKNOWN":
      return "text-unknown bg-unknown";
    case "SUSPICIOUS":
      return "text-suspicious bg-suspicious";
    case "HIGH":
      return "text-high bg-high";
    default:
      return "text-unknown bg-unknown";
  }
};
const getRiskBarColor = (level) => {
  switch (level) {
    case "LOW":
      return "#22c55e";
    case "UNKNOWN":
      return "#94a3b8";
    case "SUSPICIOUS":
      return "#f97316";
    case "HIGH":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
};
const getRiskLabel = (level) => level || "Analyzing...";
const getRiskEmoji = (level) => {
  switch (level) {
    case "LOW":
      return "✅";
    case "UNKNOWN":
      return "❓";
    case "SUSPICIOUS":
      return "⚠️";
    case "HIGH":
      return "🚨";
    default:
      return "🔍";
  }
};
const Popup = () => {
  const [state, setState] = reactExports.useState({
    loading: true,
    error: null,
    currentURL: "",
    currentDomain: "",
    urlResult: null,
    pageAnalysis: null,
    settings: null
  });
  const analyze = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0 || !tabs[0].url) {
        throw new Error("No active tab URL found");
      }
      const url = tabs[0].url;
      const domain = new URL(url).hostname;
      setState((s) => ({ ...s, currentURL: url, currentDomain: domain }));
      const result = await new Promise((res) => {
        chrome.runtime.sendMessage({ type: "ANALYZE_URL", payload: { url } }, (resp) => {
          if (chrome.runtime.lastError) {
            res({ url, domain, riskLevel: "UNKNOWN", score: 0, indicators: [{ code: "ERR", message: "Analysis failed", score: 0 }], isCached: false, analyzedAt: Date.now() });
          } else {
            res(resp || { url, domain, riskLevel: "LOW", score: 0, indicators: [], isCached: false, analyzedAt: Date.now() });
          }
        });
      });
      setState((s) => ({ ...s, urlResult: result, loading: false }));
    } catch (err) {
      setState((s) => ({ ...s, error: err.message || "Error occurred", loading: false }));
    }
  };
  reactExports.useEffect(() => {
    analyze();
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (settings) => {
      if (!chrome.runtime.lastError && settings) {
        setState((s) => ({ ...s, settings }));
      }
    });
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "header", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "shield-icon", children: "🛡️" }),
      " Web Security Shield"
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "url-display", title: state.currentURL, children: state.currentDomain || "Loading..." }),
    state.loading ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "spinner" }) : state.error ? /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-high", children: state.error }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "score-container", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: `badge ${getRiskColor(state.urlResult?.riskLevel)}`, children: [
          getRiskEmoji(state.urlResult?.riskLevel),
          " ",
          getRiskLabel(state.urlResult?.riskLevel)
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "score-bar-bg", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "score-bar-fill",
            style: {
              width: `${state.urlResult?.score || 0}%`,
              backgroundColor: getRiskBarColor(state.urlResult?.riskLevel)
            }
          }
        ) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { style: { fontWeight: "bold" }, children: [
          state.urlResult?.score || 0,
          "/100"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", style: { backgroundColor: "#0f172a", marginBottom: "16px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { style: { marginTop: 0, fontSize: "1rem" }, children: "Findings" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "indicator-list", children: state.urlResult?.indicators.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "indicator-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: "✅" }),
          " No threats detected"
        ] }) : state.urlResult?.indicators.map((ind, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs("li", { className: "indicator-item", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: ind.score > 50 ? "🚨" : ind.score > 20 ? "⚠️" : "ℹ️" }),
          ind.message
        ] }, i)) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-secondary", onClick: () => analyze(), children: "Scan Again" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", onClick: () => chrome.runtime.openOptionsPage(), children: "Options" })
      ] })
    ] })
  ] });
};
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(Popup, {}));
//# sourceMappingURL=popup-D6PzRpOE.js.map
