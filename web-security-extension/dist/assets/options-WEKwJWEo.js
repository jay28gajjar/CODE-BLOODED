import { c as createRoot, j as jsxRuntimeExports, r as reactExports } from './client-B0hW2Wui.js';

const Options = () => {
  const [settings, setSettings] = reactExports.useState(null);
  const [saveStatus, setSaveStatus] = reactExports.useState("");
  const [newBrand, setNewBrand] = reactExports.useState("");
  reactExports.useEffect(() => {
    chrome.runtime.sendMessage({ type: "GET_SETTINGS" }, (res) => {
      if (!chrome.runtime.lastError && res) {
        setSettings(res);
      } else {
        setSettings({
          enableURLProtection: true,
          enableHoverAnalysis: false,
          enableClickWarnings: true,
          enableWebpageAnalysis: true,
          enableEmailAnalysis: false,
          enableSearchAnalysis: false,
          showPageBadge: true,
          enableLocalAnalysis: true,
          enableAIAnalysis: false,
          storeScanHistory: true,
          googleSafeBrowsingApiKey: "",
          virusTotalApiKey: "",
          aiProviderApiKey: "",
          aiProvider: "none",
          sensitivityLevel: "medium",
          protectedBrands: ["google", "microsoft", "apple", "amazon", "paypal"],
          riskThresholds: { suspicious: 50, high: 75 }
        });
      }
    });
  }, []);
  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    chrome.runtime.sendMessage({ type: "SAVE_SETTINGS", payload: newSettings }, () => {
      setSaveStatus("Saved!");
      setTimeout(() => setSaveStatus(""), 2e3);
    });
  };
  const handleChange = (key, value) => {
    if (settings) {
      saveSettings({ ...settings, [key]: value });
    }
  };
  const handleAddBrand = () => {
    if (newBrand.trim() && settings && !settings.protectedBrands.includes(newBrand.trim().toLowerCase())) {
      saveSettings({
        ...settings,
        protectedBrands: [...settings.protectedBrands, newBrand.trim().toLowerCase()]
      });
      setNewBrand("");
    }
  };
  const handleRemoveBrand = (brand) => {
    if (settings) {
      saveSettings({
        ...settings,
        protectedBrands: settings.protectedBrands.filter((b) => b !== brand)
      });
    }
  };
  if (!settings) return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { children: "Loading settings..." });
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "header", children: /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { children: "🛡️ Shield Settings" }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Protection" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "Enable URL Protection" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Analyze URLs before navigation" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: settings.enableURLProtection, onChange: (e) => handleChange("enableURLProtection", e.target.checked) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "slider" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "Webpage Analysis" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Scan page contents for threats" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: settings.enableWebpageAnalysis, onChange: (e) => handleChange("enableWebpageAnalysis", e.target.checked) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "slider" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "Show Page Badge" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Display floating security indicator" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: settings.showPageBadge, onChange: (e) => handleChange("showPageBadge", e.target.checked) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "slider" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Privacy" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "Local Analysis" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Run basic heuristic checks offline" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: settings.enableLocalAnalysis, disabled: true }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "slider" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "External AI Analysis" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Use AI provider to deeply analyze suspicious pages" }),
          settings.enableAIAnalysis && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "warning-box", children: "Enabling this may transmit webpage content to your configured AI provider" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: settings.enableAIAnalysis, onChange: (e) => handleChange("enableAIAnalysis", e.target.checked) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "slider" })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-row", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "Store Scan History" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Keep a local log of analyzed URLs" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "switch", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: settings.storeScanHistory, onChange: (e) => handleChange("storeScanHistory", e.target.checked) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "slider" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Threat Intelligence Integrations" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "Google Safe Browsing API Key" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: settings.googleSafeBrowsingApiKey, onChange: (e) => handleChange("googleSafeBrowsingApiKey", e.target.value), placeholder: "API Key" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "setting-info", style: { marginTop: "16px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-title", children: "VirusTotal API Key" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: settings.virusTotalApiKey, onChange: (e) => handleChange("virusTotalApiKey", e.target.value), placeholder: "API Key" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "AI Provider" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "radio-group", children: ["none", "openai", "gemini", "anthropic"].map((provider) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "radio-label", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "aiProvider", checked: settings.aiProvider === provider, onChange: () => handleChange("aiProvider", provider) }),
        provider.toUpperCase()
      ] }, provider)) }),
      settings.aiProvider !== "none" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { style: { marginTop: "12px" }, children: /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "password", value: settings.aiProviderApiKey, onChange: (e) => handleChange("aiProviderApiKey", e.target.value), placeholder: `${settings.aiProvider.toUpperCase()} API Key` }) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Sensitivity" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "radio-group", children: ["low", "medium", "high"].map((level) => /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "radio-label", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "radio", name: "sensitivity", checked: settings.sensitivityLevel === level, onChange: () => handleChange("sensitivityLevel", level) }),
        level.charAt(0).toUpperCase() + level.slice(1)
      ] }, level)) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Protected Brands" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "setting-desc", children: "Alert if a site tries to impersonate these brands" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "tag-list", children: settings.protectedBrands.map((brand) => /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "tag", children: [
        brand,
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "tag-remove", onClick: () => handleRemoveBrand(brand), children: "×" })
      ] }, brand)) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "8px", marginTop: "12px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "text", value: newBrand, onChange: (e) => setNewBrand(e.target.value), onKeyPress: (e) => e.key === "Enter" && handleAddBrand(), placeholder: "Add brand..." }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-secondary", onClick: handleAddBrand, children: "Add" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "section-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Data Management" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { style: { display: "flex", gap: "8px" }, children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-danger", onClick: () => {
          if (confirm("Clear URL cache?")) console.log("cleared");
        }, children: "Clear URL Cache" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "btn btn-danger", onClick: () => {
          if (confirm("Clear history?")) console.log("cleared");
        }, children: "Clear Scan History" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "save-container", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "success-msg", children: saveStatus }) })
  ] });
};
const root = createRoot(document.getElementById("root"));
root.render(/* @__PURE__ */ jsxRuntimeExports.jsx(Options, {}));
//# sourceMappingURL=options-WEKwJWEo.js.map
