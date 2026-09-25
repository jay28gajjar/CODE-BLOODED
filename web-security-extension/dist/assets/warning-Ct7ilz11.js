import { c as createRoot, j as jsxRuntimeExports, r as reactExports } from './client-B0hW2Wui.js';

const Warning = () => {
  const [url, setUrl] = reactExports.useState("");
  const [score, setScore] = reactExports.useState(0);
  const [level, setLevel] = reactExports.useState("HIGH");
  const [indicators, setIndicators] = reactExports.useState([]);
  const [countdown, setCountdown] = reactExports.useState(5);
  reactExports.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetUrl = params.get("url") || "";
    try {
      const parsed = new URL(targetUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
      setUrl(targetUrl);
    } catch {
      setUrl("");
    }
    setScore(Number(params.get("score")) || 100);
    setLevel(params.get("level") || "HIGH");
    try {
      const inds = params.get("indicators");
      if (inds) {
        setIndicators(JSON.parse(decodeURIComponent(inds)));
      }
    } catch (e) {
      console.error("Failed to parse indicators");
    }
    const timer = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1e3);
    return () => clearInterval(timer);
  }, []);
  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };
  const handleContinue = () => {
    if (countdown === 0 && url) {
      window.location.href = url;
    }
  };
  if (!url) {
    return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "Invalid URL" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", onClick: handleGoBack, children: "Go Back" })
    ] });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "card", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "icon", children: "⚠️" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "High-Risk Website Detected" }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: "This page has been blocked because it poses a security threat." }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "url-box", children: url.length > 80 ? url.substring(0, 80) + "..." : url }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "score", children: [
      "Risk Score: ",
      score,
      "/100"
    ] }),
    indicators.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("ul", { className: "indicator-list", children: indicators.map((ind, i) => /* @__PURE__ */ jsxRuntimeExports.jsx("li", { children: ind.message }, i)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "actions", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-primary", onClick: handleGoBack, children: "Go Back (Safe)" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          className: "btn btn-danger",
          onClick: handleContinue,
          disabled: countdown > 0,
          children: countdown > 0 ? `Continue Anyway (${countdown})` : "Continue Anyway"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "footer", children: "Web Security Shield - Protecting your browsing" })
  ] });
};
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(Warning, {}));
//# sourceMappingURL=warning-Ct7ilz11.js.map
