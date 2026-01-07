/* ClearCover Trust‑First Insurance Portal (Demo)
   Updated to align with:
   - Lean Auto Insurance Proposal Form fields + canvas app guidelines
   - Silver / Gold demo policy wording (plain-English)
   - Trust-first principles (consistency across Portal/Agent/PDF)

   Notes:
   - Static demo: stores data in browser localStorage
   - No real pricing: premium is the demo premium from the policy docs/guidelines
*/

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const LS_KEY = "clearguide_policy_v2";

  // TODO: Set this to your Custom GPT URL (example: "https://chatgpt.com/g/g-XXXX")
  const CHATBOT_URL = "https://chatgpt.com/";

  const VEHICLE_VALUE_THRESHOLD = 1500000; // ₹15,00,000

  const PLANS = {
    Silver: {
      key: "Silver",
      policyName: "Silver Auto",
      defaultPeriod: "1 Year",
      coveredVehicleRule: "Below Rs. 15,00,000",
      premiumINR: 12000,
      coveragePackage: "Silver Cover",
      coverages: [
        {
          coverage: "Liability (BI/PD)",
          what: "Injuries to others (bodily injury) and damage to others' property when you are at fault.",
          limit: "Rs. 100,000–300,000 for BI; Rs. 100,000 PD",
          deductible: "N/A"
        },
        {
          coverage: "Collision",
          what: "Damage to your covered vehicle from a collision with another vehicle or object, regardless of fault.",
          limit: "Actual Cash Value (ACV)",
          deductible: "Rs. 500"
        }
      ],
      conditions: [
        "Coverage applies only to covered losses during the policy period involving the covered vehicle.",
        "Report a claim as soon as reasonably possible and cooperate with the investigation.",
        "Any deductible shown is your responsibility per loss."
      ],
      exclusions: [
        "Intentional damage or fraudulent claims.",
        "Racing, stunting, or organized speed contests.",
        "Wear and tear, mechanical breakdown, or maintenance-related damage."
      ],
      claims: "Claims (Demo): Call 1-234-567-890 or email claims@example.com"
    },

    Gold: {
      key: "Gold",
      policyName: "Gold Auto",
      defaultPeriod: "2 Years",
      coveredVehicleRule: "Above Rs. 15,00,000",
      premiumINR: 22000,
      coveragePackage: "Gold Cover",
      coverages: [
        {
          coverage: "Liability (BI/PD)",
          what: "Injuries to others (bodily injury) and damage to others' property when you are at fault.",
          limit: "Rs. 2,00,000–4,00,000 for BI; Rs. 2,50,000 PD",
          deductible: "N/A"
        },
        {
          coverage: "Collision",
          what: "Damage to your covered vehicle from a collision with another vehicle or object, regardless of fault.",
          limit: "Actual Cash Value (ACV)",
          deductible: "Rs. 500"
        },
        {
          coverage: "Comprehensive",
          what: "Damage to your vehicle from non-collision events such as theft, fire, hail, vandalism, or animal impact.",
          limit: "Actual Cash Value (ACV)",
          deductible: "Rs. 250"
        },
        {
          coverage: "Rental Reimbursement",
          what: "A rental car while your covered vehicle is being repaired for a covered collision or comprehensive loss.",
          limit: "Rs. 1000/day (max 30 days)",
          deductible: "Rs. 0"
        }
      ],
      conditions: [
        "Coverage applies only to covered losses during the policy period involving the covered vehicle.",
        "Report a claim as soon as reasonably possible and cooperate with the investigation.",
        "Any deductible shown is your responsibility per loss."
      ],
      exclusions: [
        "Intentional damage or fraudulent claims.",
        "Racing, stunting, or organized speed contests."
      ],
      claims: "Claims (Demo): Call 1-234-567-890 or email claims@example.com"
    }
  };

  const formatINR = (n) => {
    if (!Number.isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-IN").format(n);
    } catch {
      return String(n);
    }
  };

  const nowStamp = () => new Date().toLocaleString();

  const defaultPolicy = () => ({
    version: 0,
    insuranceType: "", // auto | twoWheeler
    proposal: {
      policyType: "", // Silver | Gold
      policyPeriod: "",
      proposerName: "",
      mobileNumber: "",
      vehicleRegNumber: "",
      vehicleValueINR: "",
      coveragePackage: "",
      annualPremiumINR: 0,
      declarationAccepted: false
    },
    systems: {
      portal: { version: 0, updatedAt: "—" },
      agent: { version: 0, updatedAt: "—" },
      pdf: { version: 0, updatedAt: "—" }
    },
    history: [] // { at, version, action, note }
  });

  let policy = loadPolicy() || defaultPolicy();
  let currentTab = "quote";
  let currentStep = 0;

  // ---------- storage ----------
  function savePolicy() {
    localStorage.setItem(LS_KEY, JSON.stringify(policy));
  }
  function loadPolicy() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      // basic sanity
      if (!obj || typeof obj !== "object") return null;
      if (!obj.proposal) return null;
      return obj;
    } catch {
      return null;
    }
  }

  // ---------- help panel ----------
  function setHelp(title, body) {
    const t = $("#helpTitle");
    const b = $("#helpBody");
    if (t) t.textContent = title || "Help";
    if (b) b.textContent = body || "";
  }

  function bindHelp() {
    const helpables = $$("[data-help-title]");
    helpables.forEach((el) => {
      const title = el.getAttribute("data-help-title");
      const body = el.getAttribute("data-help-body");
      el.addEventListener("mouseenter", () => setHelp(title, body));
      el.addEventListener("focusin", () => setHelp(title, body));
    });
  }

  // ---------- tabs ----------
  function setTab(tab) {
    currentTab = tab;
    $$(".tab").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
    $("#view-quote").hidden = tab !== "quote";
    $("#view-policy").hidden = tab !== "policy";
    $("#view-agent").hidden = tab !== "agent";
    $("#view-quality").hidden = tab !== "quality";

    if (tab === "policy") renderPolicyView();
    if (tab === "agent") renderAgentView();
    if (tab === "quality") renderQualityView();
  }

  // ---------- stepper ----------
  function setStep(step) {
    currentStep = Math.max(0, Math.min(4, step));
    $$("[data-step]").forEach((v) => (v.hidden = Number(v.dataset.step) !== currentStep));

    $$(".step").forEach((s) => {
      const i = Number(s.dataset.stepInd);
      s.classList.toggle("is-active", i === currentStep);
      s.classList.toggle("is-done", i < currentStep);
    });

    $("#btnNext").textContent = currentStep === 4 ? "Done" : "Next";
    $("#btnBack").disabled = currentStep === 0;

    const activeStep = $(`.step-view[data-step="${currentStep}"]`);
    if (activeStep) {
      setHelp(activeStep.getAttribute("data-help-title"), activeStep.getAttribute("data-help-body"));
    }

    // Keep UI synced whenever step changes
    syncFormToState();
    renderPolicyDoc();
    renderReviewIfNeeded();
    updateSystemWidgets();
    savePolicy();
  }

  // ---------- system views (portal/agent/pdf) ----------
  function computeSyncStatus() {
    const v = policy.version;
    const okPortal = policy.systems.portal.version === v;
    const okAgent = policy.systems.agent.version === v;
    const okPdf = policy.systems.pdf.version === v;

    if (okPortal && okAgent && okPdf) return { label: "OK", className: "sync-ok" };
    const matches = [okPortal, okAgent, okPdf].filter(Boolean).length;
    if (matches === 2) return { label: "PARTIAL", className: "sync-warn" };
    return { label: "MISMATCH", className: "sync-bad" };
  }

  function updateSystemWidgets() {
    const vEl = $("#policyVersion");
    if (vEl) vEl.textContent = `v${policy.version}`;

    const sync = computeSyncStatus();
    const syncEl = $("#syncStatus");
    if (syncEl) {
      syncEl.textContent = sync.label;
      syncEl.className = sync.className;
    }

    // review stamps
    const sp = $("#stampPortal");
    const sa = $("#stampAgent");
    const sd = $("#stampPdf");
    if (sp) sp.textContent = policy.systems.portal.updatedAt || "—";
    if (sa) sa.textContent = policy.systems.agent.updatedAt || "—";
    if (sd) sd.textContent = policy.systems.pdf.updatedAt || "—";

    // sidebar mini
    const mp = $("#miniPortal");
    const ma = $("#miniAgent");
    const md = $("#miniPdf");
    if (mp) mp.textContent = `v${policy.systems.portal.version} • ${policy.systems.portal.updatedAt}`;
    if (ma) ma.textContent = `v${policy.systems.agent.version} • ${policy.systems.agent.updatedAt}`;
    if (md) md.textContent = `v${policy.systems.pdf.version} • ${policy.systems.pdf.updatedAt}`;
  }

  function publish(note = "Published from review") {
    policy.version += 1;
    const stamp = nowStamp();
    policy.systems.portal = { version: policy.version, updatedAt: stamp };
    policy.systems.agent = { version: policy.version, updatedAt: stamp };
    policy.systems.pdf = { version: policy.version, updatedAt: stamp };
    policy.history.unshift({ at: stamp, version: policy.version, action: "Publish", note });
    savePolicy();
    updateSystemWidgets();
  }

  function simulateMismatch() {
    const stamp = nowStamp();
    const target = Math.random() < 0.5 ? "agent" : "pdf";
    policy.systems[target] = { version: Math.max(0, policy.version - 1), updatedAt: stamp + " (stale)" };
    savePolicy();
    updateSystemWidgets();
  }

  function reconcile() {
    const stamp = nowStamp();
    policy.systems.portal = { version: policy.version, updatedAt: stamp };
    policy.systems.agent = { version: policy.version, updatedAt: stamp };
    policy.systems.pdf = { version: policy.version, updatedAt: stamp };
    policy.history.unshift({ at: stamp, version: policy.version, action: "Reconcile", note: "Aligned system views to one source of truth" });
    savePolicy();
    updateSystemWidgets();
  }

  // ---------- selection (type + plan) ----------
  function bindTypeCards() {
    $$(".type-card").forEach((card) => {
      card.addEventListener("click", () => {
        policy.insuranceType = card.dataset.type || "";
        $$(".type-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.type === policy.insuranceType));
        // Move forward
        setStep(1);
      });
    });

    if (policy.insuranceType) {
      $$(".type-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.type === policy.insuranceType));
    }
  }

  function bindPlanCards() {
    $$(".plan-card").forEach((card) => {
      card.addEventListener("click", () => {
        const planKey = card.dataset.plan;
        if (!planKey || !PLANS[planKey]) return;
        applyPlan(planKey, true);
        $$(".plan-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.plan === planKey));
        setStep(2);
      });
    });

    if (policy.proposal.policyType) {
      $$(".plan-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.plan === policy.proposal.policyType));
    }
  }

  function applyPlan(planKey, autoSetPeriod) {
    const plan = PLANS[planKey];
    if (!plan) return;

    policy.proposal.policyType = plan.key;
    policy.proposal.coveragePackage = plan.coveragePackage;
    policy.proposal.annualPremiumINR = plan.premiumINR;

    if (autoSetPeriod) {
      policy.proposal.policyPeriod = plan.defaultPeriod;
    } else {
      // if user hasn't selected period yet, set default
      if (!policy.proposal.policyPeriod) policy.proposal.policyPeriod = plan.defaultPeriod;
    }

    savePolicy();
    syncFormToState();
    renderPolicyDoc();
    renderReviewIfNeeded();
  }

  // ---------- proposal form bindings ----------
  function bindProposalFields() {
    const elPolicyType = $("#policyType");
    const elPolicyPeriod = $("#policyPeriod");
    const elName = $("#proposerName");
    const elMobile = $("#mobileNumber");
    const elReg = $("#vehicleRegNumber");
    const elValue = $("#vehicleValueINR");
    const elPkg = $("#coveragePackage");
    const elPrem = $("#annualPremium");
    const elDecl = $("#declarationAccepted");

    if (!elPolicyType) return; // not on page

    // Set initial values
    syncFormToState();

    elPolicyType.addEventListener("change", () => {
      const v = elPolicyType.value;
      if (!v) {
        policy.proposal.policyType = "";
        policy.proposal.coveragePackage = "";
        policy.proposal.annualPremiumINR = 0;
      } else {
        applyPlan(v, true);
      }
      validateLive();
    });

    elPolicyPeriod.addEventListener("change", () => {
      policy.proposal.policyPeriod = elPolicyPeriod.value;
      validateLive();
      savePolicy();
    });

    elName.addEventListener("input", () => {
      policy.proposal.proposerName = elName.value.trim();
      validateLive();
      savePolicy();
    });

    elMobile.addEventListener("input", () => {
      policy.proposal.mobileNumber = elMobile.value.trim();
      validateLive();
      savePolicy();
    });

    elReg.addEventListener("input", () => {
      policy.proposal.vehicleRegNumber = elReg.value.trim();
      validateLive();
      savePolicy();
    });

    elValue.addEventListener("input", () => {
      policy.proposal.vehicleValueINR = elValue.value.trim();
      updateVehicleValueHint();
      validateLive();
      savePolicy();
    });

    elDecl.addEventListener("change", () => {
      policy.proposal.declarationAccepted = !!elDecl.checked;
      validateLive();
      savePolicy();
    });

    // read-only
    if (elPkg) elPkg.setAttribute("readonly", "readonly");
    if (elPrem) elPrem.setAttribute("readonly", "readonly");
  }

  function syncFormToState() {
    const p = policy.proposal;

    const setVal = (id, val) => {
      const el = $("#" + id);
      if (!el) return;
      if (el.type === "checkbox") el.checked = !!val;
      else el.value = val ?? "";
    };

    setVal("policyType", p.policyType);
    setVal("policyPeriod", p.policyPeriod);
    setVal("proposerName", p.proposerName);
    setVal("mobileNumber", p.mobileNumber);
    setVal("vehicleRegNumber", p.vehicleRegNumber);
    setVal("vehicleValueINR", p.vehicleValueINR);
    setVal("coveragePackage", p.coveragePackage);
    setVal("annualPremium", p.annualPremiumINR ? `₹${formatINR(p.annualPremiumINR)}` : "");
    setVal("declarationAccepted", p.declarationAccepted);

    updateVehicleValueHint();
  }

  function updateVehicleValueHint() {
    const hint = $("#vehicleValueHint");
    if (!hint) return;

    const vRaw = policy.proposal.vehicleValueINR;
    const planKey = policy.proposal.policyType;
    const v = Number(String(vRaw).replace(/,/g, ""));

    hint.textContent = "";

    if (!vRaw) return;
    if (!Number.isFinite(v) || v <= 0) {
      hint.textContent = "Enter a positive number (example: 900000).";
      return;
    }

    const plan = PLANS[planKey];
    if (!plan) {
      hint.textContent = "Choose a plan to see a recommendation.";
      return;
    }

    if (planKey === "Silver" && v >= VEHICLE_VALUE_THRESHOLD) {
      hint.textContent = "This vehicle value looks closer to Gold eligibility (above ₹15,00,000). Consider switching to Gold.";
    } else if (planKey === "Gold" && v < VEHICLE_VALUE_THRESHOLD) {
      hint.textContent = "This vehicle value looks closer to Silver eligibility (below ₹15,00,000). Consider switching to Silver.";
    } else {
      hint.textContent = "Vehicle value looks consistent with the selected plan.";
    }
  }

  // ---------- validation ----------
  function clearErrors() {
    $$("[id^='err_']").forEach((e) => (e.textContent = ""));
    const note = $("#reviewHumanNote");
    if (note) note.hidden = true;
  }

  function setErr(field, msg) {
    const el = $("#err_" + field);
    if (el) el.textContent = msg || "";
  }

  function validateAll() {
    const issues = [];
    const p = policy.proposal;

    // type
    if (!policy.insuranceType) {
      issues.push({ level: "bad", code: "missing_type", message: "Select what you want to insure (Auto or Two-wheeler)." });
    }

    // plan & period
    if (!p.policyType) {
      setErr("policyType", "Please choose Silver or Gold.");
      issues.push({ level: "bad", code: "missing_policyType", message: "Policy Type is missing." });
    }

    if (!p.policyPeriod) {
      setErr("policyPeriod", "Please choose a policy period.");
      issues.push({ level: "bad", code: "missing_policyPeriod", message: "Policy Period is missing." });
    }

    // proposer name
    if (!p.proposerName) {
      setErr("proposerName", "Please enter proposer name.");
      issues.push({ level: "bad", code: "missing_name", message: "Proposer Name is missing." });
    }

    // mobile
    if (!p.mobileNumber) {
      setErr("mobileNumber", "Please enter mobile number.");
      issues.push({ level: "bad", code: "missing_mobile", message: "Mobile Number is missing." });
    } else {
      const digits = p.mobileNumber.replace(/\D/g, "");
      if (!/^\d{10,15}$/.test(digits)) {
        setErr("mobileNumber", "Use digits only (10–15 digits).");
        issues.push({ level: "warn", code: "mobile_format", message: "Mobile number format looks off. Use digits only." });
      }
    }

    // vehicle reg
    if (!p.vehicleRegNumber) {
      setErr("vehicleRegNumber", "Please enter vehicle registration number.");
      issues.push({ level: "bad", code: "missing_reg", message: "Vehicle Registration Number is missing." });
    }

    // vehicle value
    if (!p.vehicleValueINR) {
      setErr("vehicleValueINR", "Please enter vehicle value.");
      issues.push({ level: "warn", code: "missing_value", message: "Vehicle Value (INR) is missing." });
    } else {
      const v = Number(String(p.vehicleValueINR).replace(/,/g, ""));
      if (!Number.isFinite(v) || v <= 0) {
        setErr("vehicleValueINR", "Enter a positive number.");
        issues.push({ level: "bad", code: "bad_value", message: "Vehicle Value must be a positive number." });
      } else if (p.policyType) {
        if (p.policyType === "Silver" && v >= VEHICLE_VALUE_THRESHOLD) {
          issues.push({
            level: "warn",
            code: "value_mismatch_silver",
            message: "Vehicle value suggests Gold eligibility (above ₹15,00,000). Consider switching to Gold or verifying value."
          });
        }
        if (p.policyType === "Gold" && v < VEHICLE_VALUE_THRESHOLD) {
          issues.push({
            level: "warn",
            code: "value_mismatch_gold",
            message: "Vehicle value suggests Silver eligibility (below ₹15,00,000). Consider switching to Silver or verifying value."
          });
        }
      }
    }

    // package/premium auto-set by plan
    if (p.policyType && (!p.coveragePackage || !p.annualPremiumINR)) {
      issues.push({ level: "warn", code: "calc_missing", message: "Coverage package / premium not calculated yet. Re-select the plan." });
    }

    // declaration
    if (!p.declarationAccepted) {
      setErr("declarationAccepted", "Declaration must be accepted to submit.");
      issues.push({ level: "bad", code: "missing_declaration", message: "Declaration Accepted must be checked to continue." });
    }

    // system sync
    const sync = computeSyncStatus();
    if (sync.label !== "OK") {
      issues.push({ level: "warn", code: "sync", message: "System views are out of sync. Reconcile to restore consistency." });
    }

    return issues;
  }

  function validateLive() {
    clearErrors();
    validateAll();
    renderReviewIfNeeded();
    renderPolicyDoc();
    updateSystemWidgets();
    savePolicy();
  }

  function validateStep(step) {
    // Hard block only on missing required for that step.
    const p = policy.proposal;

    if (step === 0) return !!policy.insuranceType;
    if (step === 1) return !!p.policyType;
    if (step === 2) {
      return !!p.policyType && !!p.policyPeriod && !!p.proposerName && !!p.mobileNumber && !!p.vehicleRegNumber && !!p.declarationAccepted;
    }
    if (step === 3) {
      // policy page can be seen even if warnings exist
      return true;
    }
    if (step === 4) {
      const bad = validateAll().filter((x) => x.level === "bad");
      return bad.length === 0;
    }
    return true;
  }

  // ---------- policy doc render ----------
  function renderPolicyDoc() {
    const planKey = policy.proposal.policyType;
    const plan = PLANS[planKey];

    const title = $("#policyDocTitle");
    const meta = $("#policyDocMeta");
    const table = $("#coverageTable");
    const wording = $("#policyWording");

    if (!title || !meta || !table || !wording) return;

    if (!plan) {
      title.textContent = "Select Silver or Gold to view policy details";
      meta.textContent = "—";
      table.innerHTML = "";
      wording.innerHTML = `<div class="muted">Choose a plan in Step 2 to see coverages, conditions, exclusions, and claim instructions.</div>`;
      return;
    }

    title.textContent = plan.policyName;
    meta.textContent = `${plan.defaultPeriod} • ${plan.coveredVehicleRule} • Premium ₹${formatINR(plan.premiumINR)} (demo)`;

    // table header
    const rows = [
      ["Coverage", "What it pays for", "Limit", "Deductible"],
      ...plan.coverages.map((c) => [c.coverage, c.what, c.limit, c.deductible])
    ];

    table.innerHTML = rows
      .map((r, i) => {
        const tag = i === 0 ? "th" : "td";
        return `<tr>${r.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("")}</tr>`;
      })
      .join("");

    const conditionsHtml = `<h4>Key conditions (simplified)</h4><ul>${plan.conditions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    const exclusionsHtml = `<h4>Common exclusions (examples)</h4><ul>${plan.exclusions.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
    const claimsHtml = `<h4>How to file a claim</h4><div>${escapeHtml(plan.claims)}</div>`;
    const disclaimer = `<div class="muted small" style="margin-top:10px;">For demonstration/testing only. Not a real contract of insurance.</div>`;

    wording.innerHTML = conditionsHtml + exclusionsHtml + claimsHtml + disclaimer;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---------- review ----------
  function renderReviewIfNeeded() {
    if (currentStep !== 4) return;

    const issues = validateAll();
    const host = $("#reviewIssues");
    if (!host) return;

    host.innerHTML = "";

    if (issues.length === 0) {
      host.innerHTML = `<div class="callout ok"><strong>Looks great.</strong> No issues detected.</div>`;
      const note = $("#reviewHumanNote");
      if (note) note.hidden = true;
      return;
    }

    const needsHuman = issues.some((i) => i.code && i.code.startsWith("value_mismatch"));
    const note = $("#reviewHumanNote");
    if (note) note.hidden = !needsHuman;

    issues.slice(0, 10).forEach((i) => {
      const level = i.level === "bad" ? "bad" : i.level === "warn" ? "warn" : "ok";
      const row = document.createElement("div");
      row.className = "mini-row";
      row.innerHTML = `<span><span class="badge ${level}">${level.toUpperCase()}</span> ${escapeHtml(i.message)}</span><span class="muted small">review</span>`;
      host.appendChild(row);
    });
  }

  // ---------- policy view ----------
  function policyPlainEnglish() {
    const p = policy.proposal;
    const plan = PLANS[p.policyType];

    const lines = [];
    lines.push(`<div><strong>Proposer:</strong> ${escapeHtml(p.proposerName || "—")}</div>`);
    lines.push(`<div><strong>Mobile:</strong> ${escapeHtml(p.mobileNumber || "—")}</div>`);
    lines.push(`<div><strong>Vehicle registration:</strong> ${escapeHtml(p.vehicleRegNumber || "—")}</div>`);
    lines.push(`<div><strong>Vehicle value:</strong> ${p.vehicleValueINR ? "₹" + escapeHtml(formatINR(Number(String(p.vehicleValueINR).replace(/,/g,"")))) : "—"}</div>`);

    lines.push(`<div style="margin-top:10px"><strong>Plan:</strong> ${escapeHtml(p.policyType || "—")} (${escapeHtml(p.policyPeriod || "—")})</div>`);
    lines.push(`<div><strong>Coverage package:</strong> ${escapeHtml(p.coveragePackage || "—")}</div>`);
    lines.push(`<div><strong>Premium:</strong> ${p.annualPremiumINR ? "₹" + escapeHtml(formatINR(p.annualPremiumINR)) : "—"}</div>`);

    if (plan) {
      lines.push(`<div style="margin-top:10px"><strong>Coverages included:</strong></div>`);
      lines.push(`<ul>${plan.coverages.map((c) => `<li>${escapeHtml(c.coverage)} — deductible ${escapeHtml(c.deductible)}</li>`).join("")}</ul>`);
      lines.push(`<div class="muted small">${escapeHtml(plan.claims)}</div>`);
    } else {
      lines.push(`<div class="muted" style="margin-top:10px">Choose Silver or Gold to see included coverages.</div>`);
    }

    lines.push(`<div class="muted" style="margin-top:10px">This summary should match Portal, Agent and PDF views to build trust.</div>`);
    return lines.join("");
  }

  function renderHistory() {
    const host = $("#historyList");
    if (!host) return;
    host.innerHTML = "";

    if (!policy.history || policy.history.length === 0) {
      host.innerHTML = `<div class="mini-row"><span>No changes yet</span><span class="muted small">—</span></div>`;
      return;
    }

    policy.history.slice(0, 10).forEach((h) => {
      const div = document.createElement("div");
      div.className = "mini-row";
      div.innerHTML = `<span><strong>${escapeHtml(h.action)}</strong> • v${h.version}<div class="muted small">${escapeHtml(h.note || "")}</div></span><span class="muted small">${escapeHtml(h.at)}</span>`;
      host.appendChild(div);
    });
  }

  function renderPolicyView() {
    const box = $("#policyPlain");
    if (box) box.innerHTML = policyPlainEnglish();

    const updPhone = $("#updPhone");
    const updReg = $("#updAddr"); // reused id; label in HTML changed
    if (updPhone) updPhone.value = "";
    if (updReg) updReg.value = "";

    const conf = $("#updateConfirm");
    const human = $("#updateHuman");
    if (conf) conf.hidden = true;
    if (human) human.hidden = true;

    renderHistory();
    updateSystemWidgets();
  }

  function applySelfServiceUpdate() {
    const updPhone = $("#updPhone")?.value.trim() || "";
    const updReg = $("#updAddr")?.value.trim() || ""; // reused id

    if (!updPhone && !updReg) return;

    if (updPhone) policy.proposal.mobileNumber = updPhone;
    if (updReg) policy.proposal.vehicleRegNumber = updReg;

    publish("Self-service update");
    savePolicy();

    const conf = $("#updateConfirm");
    const human = $("#updateHuman");
    if (conf) conf.hidden = false;
    if (human) human.hidden = true;

    const box = $("#policyPlain");
    if (box) box.innerHTML = policyPlainEnglish();
    renderHistory();
    updateSystemWidgets();
  }

  function escalateHumanReview() {
    const updPhone = $("#updPhone")?.value.trim() || "";
    const updReg = $("#updAddr")?.value.trim() || "";

    const reasons = [];
    if (updPhone) reasons.push("Mobile update");
    if (updReg) reasons.push("Vehicle registration update");

    const summary =
      `Request: ${reasons.join(" + ") || "Change"}.\n` +
      `Latest version: v${policy.version}.\n` +
      `Customer: ${policy.proposal.proposerName || "—"}.\n` +
      `Notes: Please verify and confirm across systems.`;

    const humanSummary = $("#humanSummary");
    if (humanSummary) humanSummary.textContent = summary;

    const conf = $("#updateConfirm");
    const human = $("#updateHuman");
    if (conf) conf.hidden = true;
    if (human) human.hidden = false;
  }

  // ---------- agent view ----------
  function renderAgentView() {
    const box = $("#agentSnapshot");
    if (!box) return;

    const sync = computeSyncStatus();
    const syncNote =
      sync.label === "OK"
        ? `<span class="badge ok">SYNC OK</span> Agent is viewing the latest version.`
        : `<span class="badge warn">SYNC WARNING</span> Agent view may be stale — reconcile recommended.`;

    const p = policy.proposal;
    const plan = PLANS[p.policyType];

    const lines = [];
    lines.push(syncNote);
    lines.push(`<div style="margin-top:10px"><strong>Customer:</strong> ${escapeHtml(p.proposerName || "—")}</div>`);
    lines.push(`<div><strong>Mobile:</strong> ${escapeHtml(p.mobileNumber || "—")}</div>`);
    lines.push(`<div><strong>Vehicle:</strong> ${escapeHtml(p.vehicleRegNumber || "—")} • value ${p.vehicleValueINR ? "₹" + escapeHtml(formatINR(Number(String(p.vehicleValueINR).replace(/,/g,"")))) : "—"}</div>`);
    lines.push(`<div><strong>Plan:</strong> ${escapeHtml(p.policyType || "—")} • ${escapeHtml(p.policyPeriod || "—")} • Premium ${p.annualPremiumINR ? "₹" + escapeHtml(formatINR(p.annualPremiumINR)) : "—"}</div>`);

    if (plan) {
      lines.push(`<div style="margin-top:10px"><strong>Included coverages:</strong></div>`);
      lines.push(`<ul>${plan.coverages.map((c) => `<li>${escapeHtml(c.coverage)}</li>`).join("")}</ul>`);
      lines.push(`<div class="muted small">${escapeHtml(plan.claims)}</div>`);
    }

    lines.push(`<div style="margin-top:10px"><strong>Likely fixes:</strong></div>`);
    lines.push(`<ul>
      <li>Confirm vehicle value aligns with plan eligibility (₹15,00,000 threshold)</li>
      <li>Ensure Portal/Agent/PDF versions match before responding</li>
      <li>Use plain-English policy summary in customer replies</li>
    </ul>`);

    box.innerHTML = lines.join("");
    updateSystemWidgets();
  }

  function draftAgentMessage() {
    const p = policy.proposal;
    const name = p.proposerName ? p.proposerName.split(" ")[0] : "there";
    const plan = PLANS[p.policyType];
    const sync = computeSyncStatus();

    const syncSentence =
      sync.label === "OK"
        ? "I’ve confirmed your policy details are consistent across our systems."
        : "I’m seeing a system mismatch and I’m reconciling it now so every view matches.";

    const policySentence =
      plan
        ? `You have the ${plan.policyName} plan (${p.policyPeriod || plan.defaultPeriod}) with premium ₹${formatINR(plan.premiumINR)}.`
        : "I’m confirming your plan selection and premium now.";

    const msg = [
      `Hi ${name},`,
      ``,
      `Thanks for reaching out — happy to help.`,
      ``,
      syncSentence,
      policySentence,
      ``,
      `Quick summary:`,
      `• Vehicle: ${p.vehicleRegNumber || "—"}${p.vehicleValueINR ? ` (value ₹${formatINR(Number(String(p.vehicleValueINR).replace(/,/g,"")))})` : ""}`,
      `• Coverage package: ${p.coveragePackage || "—"}`,
      ``,
      plan ? `${plan.claims}` : "",
      ``,
      `If you need to update your mobile or vehicle registration, you can do it in “My Policy” and you’ll get instant confirmation.`,
      ``,
      `Best,`,
      `ClearCover Support`
    ]
      .filter(Boolean)
      .join("\n");

    const ta = $("#agentDraft");
    if (ta) ta.value = msg;
  }

  // ---------- quality view ----------
  function renderQualityView() {
    const issues = validateAll();
    const host = $("#qualityIssues");
    if (!host) return;

    host.innerHTML = "";

    if (issues.length === 0) {
      host.innerHTML = `<div class="callout ok"><strong>No issues detected.</strong> Great signal for trust and lower support load.</div>`;
    } else {
      issues.slice(0, 12).forEach((i) => {
        const div = document.createElement("div");
        div.className = "mini-row";
        const cls = i.level === "bad" ? "bad" : i.level === "warn" ? "warn" : "ok";
        div.innerHTML = `<span><span class="badge ${cls}">${cls.toUpperCase()}</span> ${escapeHtml(i.message)}</span><span class="muted small">now</span>`;
        host.appendChild(div);
      });
    }

    drawTrendChart(issues);
    updateSystemWidgets();
  }

  function drawTrendChart(issues) {
    const c = $("#trendCanvas");
    if (!c) return;
    const ctx = c.getContext("2d");

    const counts = {
      required: issues.filter((x) => x.level === "bad" && x.code !== "sync").length,
      declaration: issues.some((x) => x.code === "missing_declaration") ? 1 : 0,
      eligibility: issues.filter((x) => x.code && x.code.startsWith("value_mismatch")).length,
      mobile: issues.some((x) => x.code === "mobile_format") ? 1 : 0,
      sync: issues.some((x) => x.code === "sync") ? 1 : 0
    };

    const categories = [
      { key: "required", label: "Missing required" },
      { key: "declaration", label: "Declaration" },
      { key: "eligibility", label: "Eligibility" },
      { key: "mobile", label: "Mobile format" },
      { key: "sync", label: "Sync" }
    ];

    // clear
    ctx.clearRect(0, 0, c.width, c.height);

    // background
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(0,0,0,0.10)";
    ctx.fillRect(0, 0, c.width, c.height);

    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1;
    for (let y = 40; y < c.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(c.width - 12, y);
      ctx.stroke();
    }

    const max = Math.max(2, ...Object.values(counts));
    const barW = Math.floor((c.width - 60) / categories.length);
    const baseY = c.height - 34;

    categories.forEach((cat, idx) => {
      const v = counts[cat.key];
      const h = Math.round((v / max) * 140);
      const x = 28 + idx * barW;
      const y = baseY - h;

      ctx.fillStyle = "rgba(96,165,250,0.55)";
      if (cat.key === "eligibility" && v > 0) ctx.fillStyle = "rgba(251,191,36,0.55)";
      if (cat.key === "required" && v > 0) ctx.fillStyle = "rgba(251,113,133,0.55)";
      if (cat.key === "sync" && v > 0) ctx.fillStyle = "rgba(251,191,36,0.55)";

      ctx.fillRect(x, y, barW - 12, h);

      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.font = "12px ui-sans-serif, system-ui";
      ctx.fillText(String(v), x + 6, y - 8);

      ctx.fillStyle = "rgba(255,255,255,0.60)";
      ctx.font = "11px ui-sans-serif, system-ui";
      wrapText(ctx, cat.label, x, c.height - 18, barW - 10, 12);
    });
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, yy);
        line = words[n] + " ";
        yy += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, yy);
  }

  // ---------- buttons ----------
  function bindNavButtons() {
    $("#btnNext").addEventListener("click", () => {
      if (currentStep === 4) {
        setTab("policy");
        return;
      }
      if (!validateStep(currentStep)) {
        // show errors in place
        validateLive();
        return;
      }
      setStep(currentStep + 1);
    });

    $("#btnBack").addEventListener("click", () => {
      setStep(currentStep - 1);
    });

    $("#btnPublish").addEventListener("click", () => {
      const bad = validateAll().filter((x) => x.level === "bad");
      if (bad.length) {
        validateLive();
        return;
      }
      publish("Published from review");
      renderReviewIfNeeded();
    });

    $("#btnSimMismatch").addEventListener("click", () => {
      simulateMismatch();
      renderReviewIfNeeded();
    });

    $("#btnReconcile").addEventListener("click", () => {
      reconcile();
      renderReviewIfNeeded();
    });

    $("#btnApplyUpdate").addEventListener("click", applySelfServiceUpdate);
    $("#btnNeedsHuman").addEventListener("click", escalateHumanReview);

    $("#btnGenDraft").addEventListener("click", draftAgentMessage);
    $("#btnRefreshQuality").addEventListener("click", renderQualityView);

    $("#btnGoToQuote").addEventListener("click", () => setTab("quote"));

    $("#btnReset").addEventListener("click", () => {
      if (confirm("Reset demo data stored in this browser?")) {
        localStorage.removeItem(LS_KEY);
        policy = defaultPolicy();
        currentStep = 0;
        initRender();
      }
    });

    $("#btnLoadSample").addEventListener("click", () => {
      loadSample();
      initRender();
    });
  }

  function loadSample() {
    policy = defaultPolicy();
    policy.insuranceType = "auto";
    applyPlan("Silver", true);
    policy.proposal.proposerName = "Ankit Rajesh Patel";
    policy.proposal.mobileNumber = "9876543210";
    policy.proposal.vehicleRegNumber = "MH02AB1234";
    policy.proposal.vehicleValueINR = "900000";
    policy.proposal.declarationAccepted = true;

    publish("Initial sample publish");
    savePolicy();
  }

  // ---------- init ----------
  function initRender() {
    // chatbot link
    const chatBtn = $("#openChatbot");
    if (chatBtn) chatBtn.href = CHATBOT_URL;

    // reflect selected cards
    if (policy.insuranceType) {
      $$(".type-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.type === policy.insuranceType));
    }
    if (policy.proposal.policyType) {
      $$(".plan-card").forEach((c) => c.classList.toggle("is-selected", c.dataset.plan === policy.proposal.policyType));
    }

    syncFormToState();
    renderPolicyDoc();
    renderPolicyView();
    renderAgentView();
    renderQualityView();
    updateSystemWidgets();

    // set help for current step
    const activeStep = $(`.step-view[data-step="${currentStep}"]`);
    if (activeStep) setHelp(activeStep.getAttribute("data-help-title"), activeStep.getAttribute("data-help-body"));

    setStep(currentStep);
    validateLive();
  }

  function init() {
    // tabs
    $$(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));

    // type + plan + fields
    bindTypeCards();
    bindPlanCards();
    bindProposalFields();

    // navigation buttons
    bindNavButtons();

    // help bindings
    bindHelp();

    setTab(currentTab);

    // If the user already has type/plan selected, start them at the next sensible step
    if (!policy.insuranceType) currentStep = 0;
    else if (!policy.proposal.policyType) currentStep = 1;
    else currentStep = Math.min(currentStep, 4);

    initRender();
  }

  init();
})();