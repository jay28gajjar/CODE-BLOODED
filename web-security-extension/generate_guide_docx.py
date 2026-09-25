import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=120, bottom=120, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def add_callout(doc, title, text, bg_hex="F1F5F9", border_color="0284C7"):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    set_cell_background(cell, bg_hex)
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    # Left border
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="{border_color}"/>
            <w:top w:val="none"/>
            <w:right w:val="none"/>
            <w:bottom w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(3)
    run_t = p.add_run(f"📌 {title}\n")
    run_t.bold = True
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(11)
    run_t.font.color.rgb = RGBColor(15, 23, 42)
    
    run_b = p.add_run(text)
    run_b.font.name = "Calibri"
    run_b.font.size = Pt(10)
    run_b.font.color.rgb = RGBColor(51, 65, 85)
    
    doc.add_paragraph().paragraph_format.space_after = Pt(4)

def format_heading(p, text, level=1):
    p.paragraph_format.keep_with_next = True
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.bold = True
    if level == 1:
        run.font.size = Pt(18)
        run.font.color.rgb = RGBColor(15, 23, 42)
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
    elif level == 2:
        run.font.size = Pt(14)
        run.font.color.rgb = RGBColor(30, 58, 138)
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
    elif level == 3:
        run.font.size = Pt(12)
        run.font.color.rgb = RGBColor(13, 148, 136)
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)

def add_item_card(doc, number, name, category, location, technical_role, layman_explanation, analogy):
    p_h = doc.add_paragraph()
    format_heading(p_h, f"{number}. {name} ({category})", level=2)
    
    table = doc.add_table(rows=4, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    col_widths = [Inches(1.8), Inches(4.7)]
    for row in table.rows:
        for idx, width in enumerate(col_widths):
            row.cells[idx].width = width
    
    fields = [
        ("📂 Exact Location", location, "F8FAFC"),
        ("⚙️ Technical Role", technical_role, "FFFFFF"),
        ("💡 Layman Explanation", layman_explanation, "F0FDF4"),
        ("🎯 Real-World Analogy", analogy, "FEF3C7")
    ]
    
    for row_idx, (label, content, bg) in enumerate(fields):
        c_label = table.cell(row_idx, 0)
        c_val = table.cell(row_idx, 1)
        
        set_cell_background(c_label, bg)
        set_cell_background(c_val, bg)
        set_cell_margins(c_label, top=80, bottom=80, left=120, right=120)
        set_cell_margins(c_val, top=80, bottom=80, left=120, right=120)
        
        # Border
        for c in (c_label, c_val):
            tcPr = c._tc.get_or_add_tcPr()
            b = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:left w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/><w:right w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tcBorders>')
            tcPr.append(b)
            
        p_l = c_label.paragraphs[0]
        p_l.paragraph_format.space_before = Pt(2)
        p_l.paragraph_format.space_after = Pt(2)
        r_l = p_l.add_run(label)
        r_l.bold = True
        r_l.font.name = "Calibri"
        r_l.font.size = Pt(9.5)
        r_l.font.color.rgb = RGBColor(30, 41, 59)
        
        p_v = c_val.paragraphs[0]
        p_v.paragraph_format.space_before = Pt(2)
        p_v.paragraph_format.space_after = Pt(2)
        r_v = p_v.add_run(content)
        r_v.font.name = "Calibri"
        r_v.font.size = Pt(9.5)
        r_v.font.color.rgb = RGBColor(51, 65, 85)
        if "Real-World" in label:
            r_v.italic = True
            
    doc.add_paragraph().paragraph_format.space_after = Pt(6)

def generate_document():
    doc = Document()
    
    # Page Margins: 1 inch all around
    sections = doc.sections
    for section in sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
    # --- Title Page / Header ---
    p_title = doc.add_paragraph()
    p_title.paragraph_format.space_before = Pt(24)
    p_title.paragraph_format.space_after = Pt(4)
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_t = p_title.add_run("Web Security Shield\nChrome Extension")
    run_t.font.name = "Calibri"
    run_t.font.size = Pt(26)
    run_t.bold = True
    run_t.font.color.rgb = RGBColor(15, 23, 42)
    
    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(18)
    run_sub = p_sub.add_run("Comprehensive Reference Guide to Every Tool, Technology, Dataset & Rule Used in the Project\n(Explained in Clear, Layman Terms)")
    run_sub.font.name = "Calibri"
    run_sub.font.size = Pt(13)
    run_sub.font.color.rgb = RGBColor(13, 148, 136)
    
    p_meta = doc.add_paragraph()
    p_meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_meta.paragraph_format.space_after = Pt(24)
    run_m = p_meta.add_run("Document Version: 1.0  |  Target: Google Chrome Manifest V3  |  Audience: Developers, Auditors & Non-Technical Stakeholders")
    run_m.font.name = "Calibri"
    run_m.font.size = Pt(9.5)
    run_m.font.color.rgb = RGBColor(100, 116, 139)
    
    add_callout(
        doc,
        "About This Document",
        "This document details every single programming language, framework, build tool, Chrome browser API, data structure, dictionary, and security rule used to build Web Security Shield. Every component includes its exact file location, technical duty, and a crystal-clear everyday analogy so that anyone—technical or non-technical—can understand how it protects users against cyber attacks.",
        bg_hex="EFF6FF",
        border_color="3B82F6"
    )
    
    # --- Table of Contents / Structure Overview ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Document Table of Contents", level=1)
    
    toc_items = [
        "Section 1: Executive Summary & System Blueprint",
        "Section 2: Development Languages & Frontend Frameworks (TypeScript, React 18, HTML5, CSS3, Node.js)",
        "Section 3: Build, Bundling & Testing Infrastructure (Vite, Rollup, build.mjs, Vitest, JSDOM)",
        "Section 4: Chrome Extension APIs & Browser Architecture (Manifest V3, Service Worker, Shadow DOM, MutationObserver, etc.)",
        "Section 5: Security Datasets, Rule Dictionaries & Algorithms (Brand Database, Levenshtein Typosquatting, Dangerous Schemes, etc.)",
        "Section 6: Scoring Weights, Risk Formulas & Cache Specifications",
        "Section 7: Optional External Integrations (Google Safe Browsing, VirusTotal, AI Providers)",
        "Section 8: Master Quick-Reference Comparison Matrix"
    ]
    for item in toc_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_before = Pt(2)
        p_t.paragraph_format.space_after = Pt(2)
        r = p_t.add_run(f"•  {item}")
        r.font.name = "Calibri"
        r.font.size = Pt(10.5)
        r.font.color.rgb = RGBColor(30, 41, 59)
        
    doc.add_page_break()
    
    # --- Section 1: Executive Summary ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 1: Executive Summary & System Blueprint", level=1)
    
    p = doc.add_paragraph()
    p.add_run(
        "Web Security Shield is an AI-powered, real-time phishing and web-threat defense browser extension. "
        "Unlike traditional security tools that only inspect emails or trigger after a user has already loaded a malicious page, "
        "this extension works proactively across the entire World Wide Web. When a user simply hovers their cursor over any link, "
        "the extension analyzes the destination in under 15 milliseconds using local heuristics, displaying an explainable risk score "
        "(LOW, UNKNOWN, SUSPICIOUS, or HIGH) before the user clicks."
    )
    
    add_callout(
        doc,
        "Core Architectural Flow",
        "1. USER HOVERS OVER A LINK\n"
        "2. Link Detector captures the URL and normalizes it.\n"
        "3. Reputation Cache checks if we analyzed it in the last few minutes.\n"
        "4. Risk Engine evaluates 12+ security signals (brand lookalikes, weird schemes, IP addresses, keywords).\n"
        "5. Shadow DOM Tooltip pops up near the mouse with an isolated, crystal-clear verdict.\n"
        "6. If the user clicks a High-Risk link, the Click Interceptor halts navigation and shows a full-screen safety shield.",
        bg_hex="F8FAFC",
        border_color="0D9488"
    )
    
    # --- Section 2: Development Languages & UI Tools ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 2: Development Languages & UI Frameworks", level=1)
    
    add_item_card(
        doc, "2.1", "TypeScript 5.3 (TS & TSX)", "Language / Core Logic",
        "Used across all source code in src/ and test files in tests/",
        "Provides static type-safety, interface enforcement (e.g., SecurityResult, ThreatIndicator), and compile-time error detection for every module in the project.",
        "TypeScript is JavaScript with strict rules and an automatic spell-checker. In plain JavaScript, a typo like 'user.urll' instead of 'user.url' can crash the extension while you are browsing. TypeScript catches that error instantly while writing the code.",
        "Like having a civil engineer check a skyscraper blueprint for missing support pillars before a single brick is laid."
    )
    
    add_item_card(
        doc, "2.2", "React 18", "Frontend Framework",
        "src/popup/Popup.tsx, src/options/Options.tsx, src/warning/Warning.tsx",
        "Powers the interactive user interfaces (the toolbar popup dashboard, the options settings screen, and the interstitial full-page warning). Uses useState and useEffect for dynamic reactivity.",
        "React is a system for creating user interface components like buttons, sliders, and scorecards that automatically refresh whenever the underlying security data changes, without having to reload the whole screen.",
        "Like the digital dashboard in an electric car: when speed or battery status changes, the gauges instantly shift smoothly without the driver having to press a refresh button."
    )
    
    add_item_card(
        doc, "2.3", "HTML5 & CSS3 (Modern Glassmorphism)", "Presentation Layer",
        "src/popup/popup.css, src/options/options.css, src/warning/warning.css, src/content/security-overlay.ts",
        "Structures and styles the visual elements. Uses CSS variables, dark-mode color palettes (#0F172A), backdrop blur (glassmorphism), flexbox layouts, and CSS keyframe animations.",
        "HTML is the skeleton (text, buttons, containers), and CSS is the skin, clothing, and styling. CSS makes the extension feel sleek, modern, and readable in both dark and light web environments.",
        "HTML is the wooden framing of a house; CSS is the drywall, paint, polished hardwood floors, and ambient lighting."
    )
    
    add_item_card(
        doc, "2.4", "Node.js (Runtime Environment)", "Tooling / Execution Engine",
        "Development workstation; drives package installation, build compilation, and test execution.",
        "Executes server-side JavaScript scripts outside of the browser. Node.js runs npm, Vitest, Vite, and custom automation scripts like build.mjs.",
        "Node.js is the electrical motor running the factory where the extension is built, tested, and packaged.",
        "Like the backstage crew in a theater: the audience never sees them during the play, but without them, the lights, sound, and curtains wouldn't work."
    )
    
    # --- Section 3: Build & Bundling Tools ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 3: Build, Bundling & Testing Infrastructure", level=1)
    
    add_item_card(
        doc, "3.1", "Vite 5 (Next-Gen Frontend Bundler)", "Build Tool",
        "build.mjs, vite.config.ts",
        "Compiles TypeScript, transforms JSX syntax into standard browser-compatible JavaScript, optimizes dependencies, and generates lightning-fast builds.",
        "Web browsers cannot directly understand TypeScript or React JSX files. Vite translates all modern developer files into plain, ultra-compact browser files in fractions of a second.",
        "Like a high-speed translation machine that takes a book written in shorthand code and instantly prints it out in plain English that anyone can read."
    )
    
    add_item_card(
        doc, "3.2", "Rollup (Module Bundler Engine)", "Bundling Engine",
        "Internal engine leveraged by Vite inside build.mjs",
        "Packages dozens of modular source files into single-file bundles (IIFE format for background and content scripts) and handles code-splitting for HTML extension pages.",
        "Rollup takes 50 separate puzzle pieces (code files) and glues them together into 1 or 2 solid, ready-to-run files so the browser doesn't have to load dozens of separate scripts.",
        "Like packing 50 individual camping items into one perfectly organized, lightweight backpack."
    )
    
    add_item_card(
        doc, "3.3", "Custom Multi-Phase Builder (build.mjs)", "Build Orchestrator",
        "Root project folder: build.mjs",
        "Custom script solving Chrome Manifest V3's strict architectural requirement: content scripts and background service workers must be self-contained IIFE files without dynamic imports, while popup pages use modern ES modules.",
        "Chrome extensions have very quirky rules: webpage scripts cannot import external pieces on the fly, but popup windows can. Our custom builder handles this dual requirement automatically in 4 clean phases.",
        "Like a bouncer at a club who makes sure everyone entering the VIP section has the exact dress code required for that specific room."
    )
    
    add_item_card(
        doc, "3.4", "Vitest 1.6", "Automated Testing Framework",
        "tests/*.test.ts, vite.config.ts",
        "Runs 93 automated unit tests verifying the accuracy of the URL analyzer, brand detector, domain analyzer, and risk scoring engine in under 2 seconds.",
        "Vitest is an automated quality-control inspector. Before you ship the extension to users, Vitest tests 93 tricky scenarios (like fake PayPal domains, weird IP addresses, or hacked links) to prove the code detects them properly.",
        "Like a car safety crash-test facility that tests the seatbelts and airbags 93 times before the car is sold to the public."
    )
    
    add_item_card(
        doc, "3.5", "JSDOM (Simulated Browser Environment)", "Testing Simulator",
        "tests/setup.ts",
        "Simulates a virtual browser Document Object Model (DOM) inside the Node.js terminal so tests can examine HTML elements and links without launching an actual Chrome browser window.",
        "Vitest runs on your computer's command line where there is no screen or browser. JSDOM pretends to be Google Chrome so our tests can simulate hovering on links and reading HTML tags.",
        "Like a flight simulator cockpit: pilots can practice flying through storms on the ground without risking a real aircraft."
    )

    # --- Section 4: Chrome Extension APIs & Browser Architecture ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 4: Chrome Extension APIs & Browser Architecture", level=1)
    
    add_item_card(
        doc, "4.1", "Chrome Extension Manifest V3 (MV3)", "Extension Specification",
        "manifest.json, dist/manifest.json",
        "The master identity and permission manifest governing the extension under Google's modern, secure extension platform. Specifies background service worker, permissions, and host matching.",
        "Manifest V3 is the official passport and security clearance card of the extension. It tells Google Chrome: 'Here is my name, here are the permissions I need, and here is how I promise to run securely.'",
        "Like an employee security badge granting access only to specific office doors and floors."
    )
    
    add_item_card(
        doc, "4.2", "Background Service Worker", "Background Process",
        "src/background/service-worker.ts (emitted to dist/background.js)",
        "Runs silently in the background. Listens for messages from web pages, coordinates risk calculations, communicates with external threat intelligence APIs, and manages the reputation cache.",
        "Web pages come and go as you browse, but the service worker is the central nerve center sitting in the background, ready to answer questions whenever a web page asks: 'Is this URL dangerous?'",
        "Like the central 911 dispatch center: it stays ready 24/7 to receive emergency calls from officers in the field."
    )
    
    add_item_card(
        doc, "4.3", "Shadow DOM (attachShadow)", "DOM Isolation",
        "src/content/security-overlay.ts",
        "Renders the hover security popup inside an isolated shadow DOM tree (id='wss-overlay-host'). Prevents host website CSS from corrupting the popup and prevents extension CSS from altering the webpage.",
        "Websites like Amazon, Reddit, or Gmail have thousands of their own styling rules. Without Shadow DOM, a website's font size or button colors could accidentally ruin the popup. Shadow DOM creates an impenetrable bubble.",
        "Like wearing a hazmat suit or stepping inside a soundproof booth: what happens outside cannot affect you, and what happens inside does not spill out."
    )
    
    add_item_card(
        doc, "4.4", "MutationObserver API", "DOM Event Watcher",
        "src/content/link-detector.ts, src/content/email-detector.ts",
        "Monitors the webpage document tree for newly inserted DOM nodes. Efficiently catches new links created by infinite scrolling (Twitter/X, Facebook), single-page application routing, and AJAX loads.",
        "Old extensions had to scan the whole page every few seconds, which made your computer slow and hot. MutationObserver acts as a motion detector that sleeps until a new link is actually added to the screen.",
        "Like a motion-activated porch light that only turns on when someone walks up to the door, saving electricity."
    )
    
    add_item_card(
        doc, "4.5", "WeakSet (Memory-Leak Free Tracking)", "Data Structure",
        "src/content/link-detector.ts",
        "Stores references to DOM elements that have already been scanned. Because it holds weak references, when elements are removed from the page, JavaScript automatically garbage-collects them.",
        "When you scroll through thousands of posts on social media, storing every link in an ordinary list would eventually freeze your browser. A WeakSet automatically forgets old links the moment the website deletes them from the screen.",
        "Like writing notes with disappearing ink that vanishes when you throw away the scrap of paper."
    )
    
    add_item_card(
        doc, "4.6", "chrome.storage.local", "Persistent Local Storage",
        "src/utils/storage.ts, src/security/reputation-cache.ts",
        "Stores user settings, protected brand lists, sensitivity preferences, API keys, and cached security scores securely on the user's hard drive without sending anything to external servers.",
        "This is the extension's private hard drive locker. It remembers your settings and recently inspected websites even if you turn off your computer and restart tomorrow.",
        "Like your personal safe in your bedroom: only you have the combination, and your belongings never leave the house."
    )
    
    add_item_card(
        doc, "4.7", "chrome.alarms API", "Background Scheduler",
        "src/background/service-worker.ts",
        "Sets a periodic alarm (every 12 hours) that wakes up the service worker to purge expired cache entries from disk, keeping the extension lean and memory-efficient.",
        "Modern Chrome extensions are not allowed to run forever in the background because that drains your battery. Chrome alarms act as an alarm clock that gently taps the extension on the shoulder twice a day to take out the trash.",
        "Like setting an alarm clock on your nightstand to wake you up only when it's time to water the plants."
    )
    
    add_item_card(
        doc, "4.8", "getBoundingClientRect() & Viewport Clamping", "Spatial Geometry",
        "src/content/security-overlay.ts",
        "Calculates exact pixel coordinates (left, top, right, bottom) of hovered links and ensures the popup flips left if near the right edge, or flips above if near the bottom edge.",
        "When you hover over a link in the bottom-right corner of your screen, an ordinary tooltip would appear off-screen where you can't read it. This mathematical formula detects the screen border and flips the popup into view.",
        "Like a smart robotic vacuum cleaner that detects a wall and turns around so it doesn't crash or get stuck."
    )
    
    # --- Section 5: Security Datasets, Rule Dictionaries & Algorithms ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 5: Security Datasets, Rule Dictionaries & Algorithms", level=1)
    
    add_item_card(
        doc, "5.1", "Protected Brand Database (BRAND_DATABASE)", "Security Dataset",
        "src/security/brand-detector.ts",
        "A curated dictionary of 28 high-target global organizations (Google, Microsoft, Apple, PayPal, Amazon, Chase, Wells Fargo, IRS, USPS, etc.) mapped to their verified legitimate domain lists.",
        "Cybercriminals love creating fake login pages disguised as Microsoft or PayPal. This database contains the verified real addresses for major brands so the extension can instantly spot imposters.",
        "Like a bank teller having an official photo ID binder for the bank's top VIP clients. If someone walks in claiming to be the CEO but doesn't match the photo ID, they are detained."
    )
    
    add_item_card(
        doc, "5.2", "Levenshtein Distance & Similarity Algorithm", "Mathematical Algorithm",
        "src/utils/domain-utils.ts, src/security/brand-detector.ts",
        "Calculates the minimum number of single-character edits (insertions, deletions, or substitutions) required to turn one string into another. Detects typosquatting like 'paypa1.com' or 'micros0ft.com'.",
        "Scammers often replace the letter 'l' with the number '1' or the letter 'o' with zero '0'. Humans can easily be tricked, but this math formula measures the exact visual difference and catches the counterfeit.",
        "Like a jeweler inspecting a gold coin with a magnifying glass: even if the fake coin looks real to the naked eye, the jeweler's scale immediately detects that it is 1 milligram off."
    )
    
    add_item_card(
        doc, "5.3", "Dangerous Protocol Blacklist (DANGEROUS_SCHEMES)", "Security Rule Set",
        "src/types/url.ts, src/security/url-analyzer.ts",
        "Blacklists executable and pseudo-protocol URL schemes: javascript:, data:, vbscript:, and file:. Triggers an automatic maximum threat score of 100.",
        "Web links are supposed to start with http:// or https://. If a link starts with javascript: or data:, clicking it can run hidden malicious computer code right inside your browser window.",
        "Like finding a letter in your mailbox that doesn't have a stamp or return address, but instead has a fuse attached to it. The bomb squad immediately marks it as maximum danger."
    )
    
    add_item_card(
        doc, "5.4", "Suspicious Path Keywords Dictionary", "Linguistic Dataset",
        "src/types/url.ts, src/security/url-analyzer.ts",
        "Contains 20 high-risk URL path terms: login, signin, verify, verification, account, password, reset, security, confirm, payment, update, suspend, billing, checkout, banking, secure, recover, unlock, activate.",
        "Phishing websites almost always have paths like /login or /verify-account. While legitimate sites use them too, when combined with an unknown or lookalike domain, it indicates a high probability of a credential trap.",
        "Like identifying red-flag words in an email (such as 'wire transfer' or 'inheritance'): on their own they might be innocent, but combined with an unknown sender, they signal danger."
    )
    
    add_item_card(
        doc, "5.5", "Urgency & Psychological Coercion Dictionary", "Behavioral Dataset",
        "src/types/webpage.ts, src/content/webpage-analyzer.ts, src/content/email-detector.ts",
        "Scans webpage body text and webmail messages for scare-tactic phrases: urgent, immediately, act now, expires, suspended, locked, compromised, unauthorized, verify now, within 24 hours, action required.",
        "Scammers try to panic victims into giving away passwords by claiming their account will be closed in 24 hours. The extension detects this psychological manipulation pattern.",
        "Like an alarm that rings whenever a telephone telemarketer starts shouting and pressuring an elderly person to make an immediate decision."
    )
    
    add_item_card(
        doc, "5.6", "Credential Request Sensor (Privacy-Preserving)", "Form Inspection Rule",
        "src/content/webpage-analyzer.ts",
        "Inspects DOM input elements for type='password', autocomplete='one-time-code', name*='card', or name*='account'. Detects the presence of sensitive inputs without ever reading or storing user keystrokes.",
        "To protect your privacy, the extension never looks at what you type into a password or credit card box. It only checks: 'Does a password box exist on this page?' If a password box exists on a fake domain, it sounds the alarm.",
        "Like a security guard outside a hotel room checking that the door has a deadbolt, without ever peeking through the keyhole into your private room."
    )
    
    add_item_card(
        doc, "5.7", "Suspicious TLD Registry (SUSPICIOUS_TLDS)", "Domain Dataset",
        "src/utils/domain-utils.ts, src/security/domain-analyzer.ts",
        "Flags top-level domain extensions heavily abused by scammers due to free or unverified registration: .xyz, .top, .tk, .ml, .ga, .cf, .click, .download, .zip, .review, .country, .kim, .science, .work, .party, .gq.",
        "Just as certain back alleys in a city are known for illicit activities, certain internet domain endings are notorious because scammers can buy them for pennies with no identity verification.",
        "Like checking a car's registration and noticing it has stolen or counterfeit license plates."
    )
    
    add_item_card(
        doc, "5.8", "Open Redirect & Nested URL Detector", "URL Structure Analysis",
        "src/types/url.ts, src/security/redirect-analyzer.ts, src/security/url-analyzer.ts",
        "Extracts and analyzes redirect query parameters: ?url=, ?redirect=, ?target=, ?next=, ?destination=. Protects against Server-Side Request Forgery (SSRF) without fetching foreign links.",
        "Scammers often create links that look like google.com/url?q=evil-site.com so you think it's safe. This detector unwraps the nested link inside the parameter and analyzes where it really takes you.",
        "Like a Trojan Horse: the outside of the wooden horse looks friendly, but this detector X-rays the belly to see if armed soldiers are hiding inside."
    )

    # --- Section 6: Scoring Weights & Cache Architecture ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 6: Scoring Weights & Cache Architecture", level=1)
    
    p = doc.add_paragraph()
    p.add_run(
        "The Risk Engine (src/security/risk-engine.ts) uses an additive multi-factor scoring model normalized from 0 to 100. "
        "A single indicator is never enough to falsely condemn a website (avoiding false alarms), but combinations of risky signals "
        "exponentially elevate the final threat classification."
    )
    
    # Table of Scoring Weights
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    headers = ["Security Threat Indicator", "Points Added", "Technical Justification & Layman Meaning"]
    col_w = [Inches(2.5), Inches(1.2), Inches(2.8)]
    
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_w[i]
        set_cell_background(hdr_cells[i], "1E293B")
        set_cell_margins(hdr_cells[i], top=100, bottom=100, left=100, right=100)
        p_c = hdr_cells[i].paragraphs[0]
        r = p_c.add_run(title)
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    score_rows = [
        ("Dangerous Protocol (javascript:, data:)", "+100", "Immediate critical threat; can execute malicious scripts directly."),
        ("Confirmed Threat Intelligence Hit", "+100", "Domain or URL confirmed malicious by Google Safe Browsing or VirusTotal."),
        ("Credential Form on Mismatched Domain", "+40", "Page asks for passwords but domain is not the official brand owner."),
        ("Brand Impersonation / Typosquatting", "+35", "Domain closely mimics a protected brand (e.g., paypa1.com)."),
        ("Cross-Domain Open Redirect Target", "+25", "Link routes the user through an unvalidated foreign gateway."),
        ("IP Address Destination (e.g. 192.168.1.1)", "+25", "Bypasses standard domain name registration checks."),
        ("Punycode / Homograph Attack (xn--)", "+20", "Uses foreign alphabets to visually fake standard letters."),
        ("Suspicious Top-Level Domain (.xyz, .tk)", "+15", "Uses registries frequently tied to throwaway phishing campaigns."),
        ("Login / Account Keyword in URL Path", "+10", "Indicates an authentication portal (scored only with other signals)."),
        ("URL Shortener Masking (bit.ly, t.co)", "+10", "Destination is concealed from the user; classified as UNKNOWN."),
        ("Psychological Urgency Language", "+10", "Page creates artificial panic or threats of account cancellation.")
    ]
    
    for row_data in score_rows:
        row = table.add_row()
        for idx, text in enumerate(row_data):
            c = row.cells[idx]
            c.width = col_w[idx]
            set_cell_background(c, "F8FAFC" if idx % 2 == 0 else "FFFFFF")
            set_cell_margins(c, top=60, bottom=60, left=80, right=80)
            p = c.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(9.0)
            if idx == 1:
                r.bold = True
                r.font.color.rgb = RGBColor(220, 38, 38)
            else:
                r.font.color.rgb = RGBColor(51, 65, 85)
                
    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    
    add_callout(
        doc,
        "Two-Tier Caching Architecture (reputation-cache.ts)",
        "Tier 1: High-Speed Memory Map (RAM) — Holds the 500 most recently inspected URLs for sub-millisecond retrieval.\n"
        "Tier 2: Persistent Local Disk (chrome.storage.local) — Backs up the cache so scores survive browser restarts.\n"
        "Dynamic Expiration (TTL): Low-Risk links are cached for 30 minutes; High-Risk links expire in 2 minutes so security verdicts stay fresh.",
        bg_hex="F0FDF4",
        border_color="16A34A"
    )

    # --- Section 7: Optional External Integrations ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 7: Optional External Integrations", level=1)
    
    add_item_card(
        doc, "7.1", "Google Safe Browsing v4 REST API", "Threat Intelligence",
        "src/providers/google-safe-browsing.ts",
        "Optional threat intelligence integration. Sends encrypted URL hashes to Google's public security database to check for known malware, social engineering, and harmful downloads.",
        "Google maintains a worldwide blacklist of dangerous websites reported by billions of users. If enabled in settings, the extension asks Google: 'Is this URL on your official dangerous list?'",
        "Like checking a police database for stolen vehicle license plates before buying a used car."
    )
    
    add_item_card(
        doc, "7.2", "VirusTotal v3 REST API", "Antivirus Aggregator",
        "src/providers/virustotal.ts",
        "Optional threat intelligence integration. Queries over 70 commercial antivirus scanners (Kaspersky, Bitdefender, Sophos, etc.) using base64-encoded URL identifiers with built-in rate-limiting.",
        "VirusTotal asks 70 different cybersecurity companies for their opinion simultaneously. If more than 2 security companies vote that a URL is dangerous, the extension flags it.",
        "Like getting a medical opinion from 70 top doctors simultaneously: if several of them see an infection, you take medicine immediately."
    )
    
    add_item_card(
        doc, "7.3", "AI Analysis Layer (OpenAI, Gemini, Anthropic)", "Cognitive AI Engine",
        "src/providers/ai-provider.ts",
        "Optional cognitive layer. Sends sanitized webpage text or email snippets to an advanced language model (GPT-4o Mini, Gemini 1.5 Flash, or Claude Haiku) returning structured JSON with confidence and reasons.",
        "While traditional rules look for specific keywords, AI understands nuance and context. It can read an entire deceptive email and explain: 'This message pretends to be your CEO asking for gift cards.'",
        "Like having an experienced detective look over a contract and whisper in your ear: 'Be careful, the wording in paragraph 3 is deliberately misleading.'"
    )

    # --- Section 8: Master Quick-Reference Comparison Matrix ---
    p_h = doc.add_paragraph()
    format_heading(p_h, "Section 8: Master Quick-Reference Comparison Matrix", level=1)
    
    p = doc.add_paragraph()
    p.add_run("Use this summary cheat sheet to quickly review every tool and data component, where it resides, and its everyday analogy:")
    
    matrix_table = doc.add_table(rows=1, cols=4)
    matrix_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    matrix_table.autofit = False
    
    m_headers = ["Tool / Data Name", "Project File Location", "Primary Function", "Layman Terms Analogy"]
    m_widths = [Inches(1.5), Inches(1.8), Inches(1.7), Inches(1.5)]
    
    m_hdr_cells = matrix_table.rows[0].cells
    for i, title in enumerate(m_headers):
        m_hdr_cells[i].width = m_widths[i]
        set_cell_background(m_hdr_cells[i], "0F172A")
        set_cell_margins(m_hdr_cells[i], top=80, bottom=80, left=60, right=60)
        p_c = m_hdr_cells[i].paragraphs[0]
        r = p_c.add_run(title)
        r.bold = True
        r.font.name = "Calibri"
        r.font.size = Pt(9.0)
        r.font.color.rgb = RGBColor(255, 255, 255)
        
    matrix_data = [
        ("TypeScript", "src/**/*.ts, tests/*.ts", "Strict type-checking", "Blueprint inspector"),
        ("React 18", "src/popup, src/options", "Dynamic user interface", "Interactive digital dashboard"),
        ("Vite & Rollup", "build.mjs, vite.config.ts", "Fast multi-format bundling", "Automated packaging factory"),
        ("Vitest & JSDOM", "tests/*.test.ts", "Automated test suite (93 tests)", "Car crash-test simulator"),
        ("Service Worker", "src/background/service-worker.ts", "Central extension brain", "24/7 911 dispatch center"),
        ("Shadow DOM", "src/content/security-overlay.ts", "CSS style isolation", "Soundproof glass bubble"),
        ("MutationObserver", "src/content/link-detector.ts", "Detects newly added links", "Motion-detector light"),
        ("Brand Database", "src/security/brand-detector.ts", "28 official company domains", "VIP guest list verification"),
        ("Levenshtein Math", "src/utils/domain-utils.ts", "Catches typos (paypa1.com)", "Counterfeit bill detector"),
        ("Dangerous Schemes", "src/security/url-analyzer.ts", "Blocks javascript: links", "Toxic hazard warning label"),
        ("Path Keywords", "src/types/url.ts", "Spots /login or /verify paths", "High-value bait detector"),
        ("Urgency Dictionary", "src/types/webpage.ts", "Catches 'Act now or lose money'", "High-pressure scam alert"),
        ("Credential Sensor", "src/content/webpage-analyzer.ts", "Detects password/CC inputs", "Airport metal detector"),
        ("Suspicious TLDs", "src/utils/domain-utils.ts", "Flags .xyz, .tk, .gq domains", "High-crime neighborhood sign"),
        ("Redirect Analyzer", "src/security/redirect-analyzer.ts", "Unmasks nested target links", "Trojan horse X-ray scanner"),
        ("Reputation Cache", "src/security/reputation-cache.ts", "Stores recently verified scores", "Desk notepad memory"),
        ("Google Safe Browsing", "src/providers/google-safe-browsing.ts", "Queries global blacklists", "Police stolen car check"),
        ("VirusTotal API", "src/providers/virustotal.ts", "70+ antivirus checks", "Medical second opinion board"),
        ("AI Provider", "src/providers/ai-provider.ts", "Cognitive text analysis", "Personal cyber detective")
    ]
    
    for row_items in matrix_data:
        row = matrix_table.add_row()
        for idx, text in enumerate(row_items):
            c = row.cells[idx]
            c.width = m_widths[idx]
            set_cell_background(c, "F8FAFC" if idx % 2 == 0 else "FFFFFF")
            set_cell_margins(c, top=50, bottom=50, left=60, right=60)
            p = c.paragraphs[0]
            p.paragraph_format.space_before = Pt(1)
            p.paragraph_format.space_after = Pt(1)
            r = p.add_run(text)
            r.font.name = "Calibri"
            r.font.size = Pt(8.5)
            if idx == 0:
                r.bold = True
                r.font.color.rgb = RGBColor(15, 23, 42)
            else:
                r.font.color.rgb = RGBColor(51, 65, 85)
                
    # Footer Note
    doc.add_paragraph().paragraph_format.space_after = Pt(12)
    p_foot = doc.add_paragraph()
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_foot = p_foot.add_run("Web Security Shield — Built with Security, Privacy, and Performance as First Principles.")
    r_foot.font.name = "Calibri"
    r_foot.font.size = Pt(9.0)
    r_foot.font.italic = True
    r_foot.font.color.rgb = RGBColor(148, 163, 184)
    
    # Save locations
    dest1 = r"C:\Users\Jayyg\.gemini\antigravity\scratch\web-security-extension\Web_Security_Shield_Data_and_Tools_Guide.docx"
    dest2 = r"C:\Users\Jayyg\.gemini\antigravity\brain\b41a50bb-e4f8-4a88-a763-a558f02b2f46\Web_Security_Shield_Data_and_Tools_Guide.docx"
    
    doc.save(dest1)
    doc.save(dest2)
    print(f"Document saved successfully to {dest1} and {dest2}")

if __name__ == "__main__":
    generate_document()
