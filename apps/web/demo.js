const key = "ethio-dv-demo-v2";
const seedCases = [
  { id: "DEMO-1042", name: "Aster Example", language: "Amharic", status: "Needs review", note: "Confirm the fictional profile is complete." },
  { id: "DEMO-1041", name: "Bekele Sample", language: "English", status: "In preparation", note: "" },
  { id: "DEMO-1040", name: "Hana Placeholder", language: "Amharic", status: "Ready for applicant", note: "Demo case only." },
];
const copy = {
  en: {
    demoBadge:"INTERACTIVE DEMO", exitDemo:"Exit demo", warning:"DEMO ENVIRONMENT: use synthetic information only. Do not enter real applicant details, upload real photos or documents, or make payments. Nothing here is submitted to the government.", previewWorkspace:"PREVIEW WORKSPACE", welcomeTitle:"Explore the preparation flow", welcomeBody:"This clickable prototype demonstrates a possible applicant draft and a staff case queue. It uses your browser session only and has no real account, database, file upload, or payment connection.", openApplicant:"Open applicant demo", viewStaff:"View staff demo", resetDemo:"Reset demo data", applicantWorkspace:"APPLICANT WORKSPACE · SYNTHETIC DATA", prepareDraft:"Prepare your draft", demoHome:"← Demo home", demoDraft:"Demo draft", stepPersonal:"1 · Personal", stepFamily:"2 · Family", stepPhoto:"3 · Photo & checklist", stepReview:"4 · Review", personalDetails:"PERSONAL DETAILS", sampleProfile:"Start with a sample profile", fictionalData:"Pre-filled with fictional data", givenName:"Given name", lastName:"Last name", birthDate:"Date of birth", birthCity:"City of birth", birthCountry:"Country of birth", ethiopia:"Ethiopia", other:"Other", eligibility:"Country of eligibility", emailSample:"Email (sample only)", education:"Education level", highSchool:"High school", university:"University degree", otherUnknown:"Other / unknown", marital:"Marital status", single:"Single", married:"Married", fieldsNote:"These fields are illustrative only. We have not confirmed the current DV cycle’s complete form requirements.", familyChecklist:"FAMILY CHECKLIST", familyTitle:"Review the family section", demoRows:"Editable fictional rows", rulesPending:"Cycle rules not confirmed", familyRulesNote:"Official household requirements can change. This prototype does not decide who must be included. Check the latest official instructions before preparing a real entry.", addSpouse:"＋ Add fictional spouse", addChild:"＋ Add fictional child", photoSection:"PHOTO & COMPLETENESS", checklistTitle:"Review the checklist", noPhoto:"No photo upload in demo", photoNotBuilt:"Photo review is not implemented here", photoNote:"This demo does not accept or analyze photos. Current technical criteria and per-family-member requirements must be verified against the official instructions for the applicable cycle.", checkInstructionsLabel:"I would check the current official instructions first.", checkFamilyLabel:"I would confirm every required family member is listed.", checkPhotoLabel:"I would prepare a recent photo for each person required by the current instructions.", photoDisclaimer:"In the planned service, photo feedback would be advisory and reviewed by a person. It would not guarantee acceptance.", reviewApproval:"REVIEW & APPROVAL", reviewTitle:"Review the sample draft", notOfficial:"Not an official application", applicantControl:"Applicant control", applicantControlNote:"The applicant should check every answer and submit their own official entry. Ethio DV Assist does not submit entries in this pilot.", consentLabel:"I have reviewed this fictional demo summary and understand it is not submitted anywhere.", previous:"← Previous", savedTab:"Saved in this tab only", continue:"Continue", approve:"Approve demo summary", staffWorkspace:"STAFF WORKSPACE · FICTIONAL CASES", caseQueue:"Case queue", openCases:"OPEN DEMO CASES", waitingReview:"WAITING FOR REVIEW", payment:"PAYMENT", notConnected:"Not connected", staffNote:"All names and cases are fictional seed data. Status changes and notes remain in this browser tab and are reset when you close the demo.", footerLeft:"Ethio DV Assist · Local interactive demo", footerRight:"No government affiliation · No real applicant data", stepCount:"Step {n} of 4", spouse:"Spouse", child:"Child", stepchild:"Stepchild", adoptedChild:"Adopted child", relation:"Relationship", familyName:"Fictional name", familyBirthDate:"Date of birth (sample)", removeRow:"Remove demo row", noFamilyRows:"No fictional family rows added.", spouseSingleNote:"The sample profile is marked single. Change marital status to Married to add a spouse row.", spouseAlready:"A fictional spouse row is already included.", familyCount:"Fictional family rows", approveRequired:"Check the demo consent box to continue.", approvedMessage:"Demo approval recorded in this tab. Nothing was submitted.", selectCase:"Select a demo case", selectCaseNote:"Explore status updates and fictional internal notes.", fictionalCase:"Fictional case", demoStatus:"Demo status", internalNote:"Internal demo note", notePlaceholder:"Type a fictional internal note", saveChanges:"Save demo changes", inPreparation:"In preparation", needsReview:"Needs review", readyApplicant:"Ready for applicant", closed:"Closed", resetSaved:"Saved in this tab only", storageUnavailable:"Session save unavailable; keep this tab open"
  },
  am: {
    demoBadge:"ተግባራዊ ሙከራ", exitDemo:"ከሙከራው ውጣ", warning:"የሙከራ አካባቢ፦ ምናባዊ መረጃ ብቻ ይጠቀሙ። እውነተኛ የአመልካች መረጃ አያስገቡ፣ እውነተኛ ፎቶ ወይም ሰነድ አይጫኑ፣ ክፍያም አይፈጽሙ። እዚህ ያለው ለመንግሥት አይላክም።", previewWorkspace:"የቅድመ እይታ ቦታ", welcomeTitle:"የዝግጅት ሂደቱን ይመልከቱ", welcomeBody:"ይህ ተግባራዊ ምሳሌ የአመልካች የዝግጅት ረቂቅና የሰራተኛ የጉዳይ ዝርዝር ያሳያል። የሚጠቀመው የአሳሽዎን ጊዜያዊ ማስታወሻ ብቻ ነው፤ እውነተኛ መለያ፣ ዳታቤዝ፣ ፋይል ማስጫኛ ወይም ክፍያ የለውም።", openApplicant:"የአመልካች ሙከራን ክፈት", viewStaff:"የሰራተኛ ሙከራን አሳይ", resetDemo:"የሙከራ መረጃን አጥፋ", applicantWorkspace:"የአመልካች ቦታ · ምናባዊ መረጃ", prepareDraft:"ረቂቅዎን ያዘጋጁ", demoHome:"← ወደ ሙከራው መነሻ", demoDraft:"የሙከራ ረቂቅ", stepPersonal:"1 · የግል መረጃ", stepFamily:"2 · ቤተሰብ", stepPhoto:"3 · ፎቶና ዝርዝር", stepReview:"4 · ግምገማ", personalDetails:"የግል መረጃ", sampleProfile:"የምሳሌ መረጃ ይጀምሩ", fictionalData:"በምናባዊ መረጃ የተሞላ", givenName:"የመጀመሪያ ስም", lastName:"የአባት ስም", birthDate:"የትውልድ ቀን", birthCity:"የትውልድ ከተማ", birthCountry:"የትውልድ አገር", ethiopia:"ኢትዮጵያ", other:"ሌላ", eligibility:"የብቁነት አገር", emailSample:"ኢሜይል (ለምሳሌ ብቻ)", education:"የትምህርት ደረጃ", highSchool:"ሁለተኛ ደረጃ", university:"የዩኒቨርሲቲ ዲግሪ", otherUnknown:"ሌላ / ያልታወቀ", marital:"የጋብቻ ሁኔታ", single:"ያላገባ/ያላገባች", married:"ያገባ/ያገባች", fieldsNote:"እነዚህ መስኮች ለማብራሪያ ብቻ ናቸው። የአሁኑ የDV ዙር ሙሉ ቅጽ መስፈርቶች አልተረጋገጡም።", familyChecklist:"የቤተሰብ ዝርዝር", familyTitle:"የቤተሰብ ክፍሉን ይመልከቱ", demoRows:"ሊቀየሩ የሚችሉ ምናባዊ መስመሮች", rulesPending:"የዙሩ መመሪያዎች አልተረጋገጡም", familyRulesNote:"ይፋዊ የቤተሰብ መስፈርቶች ሊለወጡ ይችላሉ። ይህ ምሳሌ ማን መካተት እንዳለበት አይወስንም። እውነተኛ ማመልከቻ ከማዘጋጀትዎ በፊት የአሁኑን ይፋዊ መመሪያ ያረጋግጡ።", addSpouse:"＋ ምናባዊ የትዳር ጓደኛ ጨምር", addChild:"＋ ምናባዊ ልጅ ጨምር", photoSection:"ፎቶና ሙሉነት", checklistTitle:"ዝርዝሩን ይመልከቱ", noPhoto:"በሙከራው ፎቶ አይጫንም", photoNotBuilt:"የፎቶ ግምገማ እዚህ አልተገነባም", photoNote:"ይህ ሙከራ ፎቶ አይቀበልም ወይም አይመረምርም። የአሁኑ የቴክኒክ መስፈርቶችና ለእያንዳንዱ የቤተሰብ አባል የሚመለከቱ መመሪያዎች ከይፋዊው የዙሩ መመሪያ መረጋገጥ አለባቸው።", checkInstructionsLabel:"መጀመሪያ የአሁኑን ይፋዊ መመሪያ አረጋግጣለሁ።", checkFamilyLabel:"ሁሉም መካተት ያለባቸው የቤተሰብ አባላት መዘርዘራቸውን አረጋግጣለሁ።", checkPhotoLabel:"በአሁኑ መመሪያ ለሚጠየቅ ሰው ሁሉ የቅርብ ጊዜ ፎቶ አዘጋጃለሁ።", photoDisclaimer:"በታቀደው አገልግሎት የፎቶ ምክር መመሪያ ብቻ ሲሆን በሰው ይገመገማል። መቀበሉን አያረጋግጥም።", reviewApproval:"ግምገማና ማጽደቅ", reviewTitle:"የምሳሌ ረቂቁን ይመልከቱ", notOfficial:"ይፋዊ ማመልከቻ አይደለም", applicantControl:"ቁጥጥሩ በአመልካቹ እጅ", applicantControlNote:"አመልካቹ እያንዳንዱን መልስ አረጋግጦ የራሱን ይፋዊ ማመልከቻ ማስገባት አለበት። Ethio DV Assist በዚህ ሙከራ ማመልከቻ አያስገባም።", consentLabel:"ይህን ምናባዊ የሙከራ ማጠቃለያ መርምሬያለሁ፤ ወደ ሌላ ቦታ እንደማይላክም ተረድቻለሁ።", previous:"← ቀዳሚ", savedTab:"በዚህ ታብ ብቻ ተቀምጧል", continue:"ቀጥል", approve:"የሙከራ ማጠቃለያን አጽድቅ", staffWorkspace:"የሰራተኛ ቦታ · ምናባዊ ጉዳዮች", caseQueue:"የጉዳይ ዝርዝር", openCases:"ክፍት የሙከራ ጉዳዮች", waitingReview:"ግምገማ የሚጠብቁ", payment:"ክፍያ", notConnected:"አልተገናኘም", staffNote:"ሁሉም ስሞችና ጉዳዮች ምናባዊ ምሳሌዎች ናቸው። የሁኔታ ለውጦችና ማስታወሻዎች በዚህ የአሳሽ ታብ ብቻ ይቆያሉ፤ ሙከራውን ሲዘጉ ይጠፋሉ።", footerLeft:"Ethio DV Assist · የአካባቢ ተግባራዊ ሙከራ", footerRight:"ከመንግሥት ጋር የተቆራኘ አይደለም · እውነተኛ የአመልካች መረጃ የለም", stepCount:"ደረጃ {n} ከ4", spouse:"የትዳር ጓደኛ", child:"ልጅ", stepchild:"የእንጀራ ልጅ", adoptedChild:"የማደጎ ልጅ", relation:"ዝምድና", familyName:"ምናባዊ ስም", familyBirthDate:"የትውልድ ቀን (ምሳሌ)", removeRow:"የሙከራ መስመሩን አስወግድ", noFamilyRows:"ምናባዊ የቤተሰብ መስመር የለም።", spouseSingleNote:"የምሳሌ መረጃው ያላገባ መሆኑን ያሳያል። የትዳር ጓደኛ ለመጨመር የጋብቻ ሁኔታን ወደ ያገባ ይቀይሩ።", spouseAlready:"ምናባዊ የትዳር ጓደኛ ተጨምሯል።", familyCount:"ምናባዊ የቤተሰብ አባላት", approveRequired:"ለመቀጠል የሙከራውን ፈቃድ ምልክት ያድርጉ።", approvedMessage:"የሙከራ ማጽደቁ በዚህ ታብ ተመዝግቧል። ምንም አልተላከም።", selectCase:"የሙከራ ጉዳይ ይምረጡ", selectCaseNote:"የሁኔታ ለውጦችንና ምናባዊ የውስጥ ማስታወሻዎችን ይመልከቱ።", fictionalCase:"ምናባዊ ጉዳይ", demoStatus:"የሙከራ ሁኔታ", internalNote:"የሙከራ የውስጥ ማስታወሻ", notePlaceholder:"ምናባዊ የውስጥ ማስታወሻ ይጻፉ", saveChanges:"የሙከራ ለውጦችን አስቀምጥ", inPreparation:"በዝግጅት ላይ", needsReview:"ግምገማ ያስፈልጋል", readyApplicant:"ለአመልካቹ ዝግጁ", closed:"ተዘግቷል", resetSaved:"በዚህ ታብ ብቻ ተቀምጧል", storageUnavailable:"ጊዜያዊ ማስቀመጥ አልተሳካም፤ ይህን ታብ ክፍት ያድርጉ"
  }
};
Object.assign(copy.en, { reviewName:"Name", reviewBirthDate:"Date of birth", reviewBirthplace:"Birthplace", reviewEligibility:"Eligibility country", reviewEmail:"Email" });
Object.assign(copy.am, { reviewName:"ስም", reviewBirthDate:"የትውልድ ቀን", reviewBirthplace:"የትውልድ ቦታ", reviewEligibility:"የብቁነት አገር", reviewEmail:"ኢሜይል" });
const form = document.querySelector("#draft-form");
const state = { step: 0, language: "en", family: [{ id: "F1", name: "Example Spouse", relation: "Spouse", birthDate: "1997-07-09" }, { id: "F2", name: "Example Child", relation: "Child", birthDate: "2018-05-20" }], cases: seedCases.map((x) => ({ ...x })), activeCase: null, approved: false };
const panels = [...document.querySelectorAll("[data-panel]")];

function t(id, values = {}) {
  let text = copy[state.language]?.[id] || copy.en[id] || id;
  for (const [keyName, value] of Object.entries(values)) text = text.replace(`{${keyName}}`, value);
  return text;
}

function relationTranslation(relation) {
  if (relation === "Adopted child") return t("adoptedChild");
  return t(relation.toLowerCase());
}

function visibleFamily() {
  const married = form.elements.namedItem("marital").value === "Married";
  return state.family.filter((person) => married || person.relation !== "Spouse");
}

function displayField(name) {
  const raw = value(name);
  const maps = {
    birthCountry: { Ethiopia: "ethiopia", Other: "other" },
    eligibility: { Ethiopia: "ethiopia", Other: "other" },
    education: { "High school": "highSchool", "University degree": "university", "Other / unknown": "otherUnknown" },
    marital: { Single: "single", Married: "married" },
  };
  return maps[name]?.[raw] ? t(maps[name][raw]) : raw;
}

function applyLanguage() {
  document.documentElement.lang = state.language === "am" ? "am" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelector("#language").textContent = state.language === "en" ? "አማርኛ" : "English";
}

function save() {
  const fields = Object.fromEntries(new FormData(form));
  const checks = Object.fromEntries(["checkInstructions", "checkFamily", "checkPhoto"].map((n) => [n, Boolean(form.elements.namedItem(n)?.checked)]));
  try {
    sessionStorage.setItem(key, JSON.stringify({ step: state.step, language: state.language, family: state.family, cases: state.cases, approved: state.approved, fields, checks }));
    document.querySelector("#autosave").textContent = t("resetSaved");
  } catch {
    document.querySelector("#autosave").textContent = t("storageUnavailable");
  }
}

function load() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(key) || "null");
    if (!saved) return;
    state.step = Math.max(0, Math.min(saved.step || 0, 3));
    if (saved.language === "am" || saved.language === "en") state.language = saved.language;
    if (Array.isArray(saved.family)) state.family = saved.family;
    if (Array.isArray(saved.cases)) state.cases = saved.cases;
    state.approved = Boolean(saved.approved);
    for (const [name, value] of Object.entries(saved.fields || {})) {
      const field = form.elements.namedItem(name);
      if (field && "value" in field) field.value = value;
    }
    for (const name of ["checkInstructions", "checkFamily", "checkPhoto"]) {
      const field = form.elements.namedItem(name);
      if (field) field.checked = Boolean(saved.checks?.[name]);
    }
  } catch { /* Storage is a convenience, not a requirement for this demo. */ }
}

function value(name) { return form.elements.namedItem(name)?.value?.trim() || "—"; }

function renderFamily() {
  const list = document.querySelector("#family-list");
  list.replaceChildren();
  const isMarried = form.elements.namedItem("marital").value === "Married";
  const spouseButton = document.querySelector("#add-spouse");
  spouseButton.disabled = !isMarried || state.family.some((person) => person.relation === "Spouse");
  spouseButton.title = !isMarried ? t("spouseSingleNote") : spouseButton.disabled ? t("spouseAlready") : "";
  if (!isMarried) {
    const note = document.createElement("p"); note.className = "field-note"; note.textContent = t("spouseSingleNote"); list.append(note);
  }
  const people = visibleFamily();
  if (!people.length) {
    const empty = document.createElement("p"); empty.className = "empty-family"; empty.textContent = t("noFamilyRows"); list.append(empty);
  }
  people.forEach((person, index) => {
    const row = document.createElement("article"); row.className = "family-row";
    const header = document.createElement("div"); header.className = "family-row-header";
    const number = document.createElement("strong"); number.textContent = `${relationTranslation(person.relation)} ${index + 1}`;
    const remove = document.createElement("button"); remove.type = "button"; remove.className = "text-button"; remove.textContent = t("removeRow");
    remove.addEventListener("click", () => { state.family = state.family.filter((item) => item.id !== person.id); renderFamily(); save(); });
    header.append(number, remove);
    const fields = document.createElement("div"); fields.className = "family-fields";
    const nameLabel = document.createElement("label"); nameLabel.textContent = t("familyName");
    const name = document.createElement("input"); name.type = "text"; name.value = person.name; name.maxLength = 80; name.autocomplete = "off";
    name.addEventListener("input", () => { person.name = name.value; save(); }); nameLabel.append(name);
    const relationLabel = document.createElement("label"); relationLabel.textContent = t("relation");
    const relation = document.createElement("select");
    const relationKeys = [["Spouse", "spouse"], ["Child", "child"], ["Stepchild", "stepchild"], ["Adopted child", "adoptedChild"]];
    relationKeys.forEach(([value, translation]) => {
      const option = document.createElement("option"); option.value = value; option.textContent = t(translation); option.selected = person.relation === value;
      option.disabled = value === "Spouse" && person.relation !== "Spouse" && state.family.some((other) => other.id !== person.id && other.relation === "Spouse");
      relation.append(option);
    });
    relation.addEventListener("change", () => { person.relation = relation.value; renderFamily(); save(); }); relationLabel.append(relation);
    const dobLabel = document.createElement("label"); dobLabel.textContent = t("familyBirthDate");
    const dob = document.createElement("input"); dob.type = "date"; dob.value = person.birthDate || ""; dob.addEventListener("input", () => { person.birthDate = dob.value; save(); }); dobLabel.append(dob);
    fields.append(nameLabel, relationLabel, dobLabel); row.append(header, fields); list.append(row);
  });
}

function renderReview() {
  const target = document.querySelector("#review-summary"); target.replaceChildren();
  const rows = [
    [t("reviewName"), `${value("givenName")} ${value("lastName")}`], [t("reviewBirthDate"), value("birthDate")],
    [t("reviewBirthplace"), `${value("birthCity")}, ${displayField("birthCountry")}`], [t("reviewEligibility"), displayField("eligibility")],
    [t("reviewEmail"), value("email")], [t("education"), displayField("education")], [t("marital"), displayField("marital")], [t("familyCount"), visibleFamily().map((person) => `${person.name} (${relationTranslation(person.relation)})`).join(", ") || "—"],
  ];
  for (const [label, content] of rows) {
    const card = document.createElement("div"); card.className = "review-item";
    const keyText = document.createElement("span"); keyText.textContent = label;
    const val = document.createElement("strong"); val.textContent = content;
    card.append(keyText, val); target.append(card);
  }
  document.querySelector("#approval-result").textContent = state.approved ? t("approvedMessage") : "";
}

function renderApplicant() {
  panels.forEach((panel, i) => { panel.hidden = i !== state.step; });
  document.querySelectorAll("[data-step-label]").forEach((el, i) => {
    el.classList.toggle("active", i === state.step); el.classList.toggle("complete", i < state.step);
  });
  document.querySelector("#step-label").textContent = t("stepCount", { n: String(state.step + 1) });
  document.querySelector("#progress").style.width = `${(state.step + 1) * 25}%`;
  document.querySelector("#previous").hidden = state.step === 0;
  document.querySelector("#next").hidden = state.step === 3;
  document.querySelector("#approve").hidden = state.step !== 3;
  if (state.step === 1) renderFamily();
  if (state.step === 3) renderReview();
  save();
}

function renderStaff() {
  const list = document.querySelector("#case-list"); list.replaceChildren();
  document.querySelector("#open-count").textContent = String(state.cases.filter((x) => x.status !== "Closed").length);
  document.querySelector("#review-count").textContent = String(state.cases.filter((x) => x.status === "Needs review").length);
  state.cases.forEach((item) => {
    const button = document.createElement("button"); button.type = "button"; button.className = `case-row${item.id === state.activeCase ? " selected" : ""}`;
    const who = document.createElement("span"); const name = document.createElement("strong"); name.textContent = item.name;
    const meta = document.createElement("small"); meta.textContent = `${item.id} · ${t("fictionalCase")}`;
    who.append(name, meta); const status = document.createElement("span"); status.className = "status-pill"; status.textContent = t(({ "In preparation":"inPreparation", "Needs review":"needsReview", "Ready for applicant":"readyApplicant", Closed:"closed" })[item.status]);
    button.append(who, status); button.addEventListener("click", () => { state.activeCase = item.id; renderStaff(); }); list.append(button);
  });
  const detail = document.querySelector("#case-detail"); detail.replaceChildren();
  const item = state.cases.find((x) => x.id === state.activeCase);
  if (!item) {
    const empty = document.createElement("div"); empty.className = "empty-state";
    const icon = document.createElement("span"); icon.textContent = "◎"; const heading = document.createElement("h2"); heading.textContent = t("selectCase");
    const body = document.createElement("p"); body.textContent = t("selectCaseNote"); empty.append(icon, heading, body); detail.append(empty); return;
  }
  const heading = document.createElement("h2"); heading.textContent = item.name; detail.append(heading);
  const meta = document.createElement("p"); meta.className = "field-note"; meta.textContent = `${item.id} · ${item.language} · Fictional record`; detail.append(meta);
  const statusLabel = document.createElement("label"); statusLabel.className = "field-label"; statusLabel.textContent = t("demoStatus");
  const select = document.createElement("select"); select.className = "status-select";
  [["In preparation", "inPreparation"], ["Needs review", "needsReview"], ["Ready for applicant", "readyApplicant"], ["Closed", "closed"]].forEach(([s, label]) => {
    const option = document.createElement("option"); option.value = s; option.textContent = t(label); option.selected = s === item.status; select.append(option);
  });
  select.addEventListener("change", () => { item.status = select.value; save(); renderStaff(); }); statusLabel.append(select); detail.append(statusLabel);
  const noteLabel = document.createElement("label"); noteLabel.className = "field-label"; noteLabel.textContent = t("internalNote");
  const note = document.createElement("textarea"); note.rows = 4; note.maxLength = 280; note.value = item.note; note.placeholder = t("notePlaceholder");
  note.addEventListener("input", () => { item.note = note.value; save(); }); noteLabel.append(note); detail.append(noteLabel);
  const saveButton = document.createElement("button"); saveButton.className = "primary"; saveButton.type = "button"; saveButton.textContent = t("saveChanges");
  saveButton.addEventListener("click", () => { save(); renderStaff(); }); detail.append(saveButton);
}

function show(view) {
  document.querySelector("#welcome").hidden = view !== "welcome";
  document.querySelector("#applicant").hidden = view !== "applicant";
  document.querySelector("#staff").hidden = view !== "staff";
  if (view === "applicant") renderApplicant();
  if (view === "staff") renderStaff();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelector("#start-applicant").addEventListener("click", () => show("applicant"));
document.querySelector("#start-staff").addEventListener("click", () => show("staff"));
document.querySelectorAll("[data-back]").forEach((el) => el.addEventListener("click", () => show("welcome")));
document.querySelector("#add-spouse").addEventListener("click", () => {
  if (form.elements.namedItem("marital").value !== "Married" || state.family.some((person) => person.relation === "Spouse")) return;
  state.family.push({ id: `F${Date.now()}`, name: "Example Spouse", relation: "Spouse", birthDate: "1997-07-09" }); renderFamily(); save();
});
document.querySelector("#add-child").addEventListener("click", () => {
  state.family.push({ id: `F${Date.now()}`, name: `Example Child ${state.family.length + 1}`, relation: "Child", birthDate: "2018-05-20" }); renderFamily(); save();
});
form.elements.namedItem("marital").addEventListener("change", () => { renderFamily(); save(); });
document.querySelector("#previous").addEventListener("click", () => { state.step = Math.max(0, state.step - 1); renderApplicant(); });
document.querySelector("#next").addEventListener("click", () => {
  for (const field of panels[state.step].querySelectorAll("[required]")) if (!field.reportValidity()) return;
  state.approved = false; state.step = Math.min(3, state.step + 1); renderApplicant();
});
document.querySelector("#approve").addEventListener("click", () => {
  const consent = document.querySelector("#consent");
  if (!consent.checked) { document.querySelector("#approval-result").textContent = "Check the demo consent box to continue."; consent.focus(); return; }
  state.approved = true; renderReview(); save();
});
document.querySelector("#language").addEventListener("click", () => {
  state.language = state.language === "en" ? "am" : "en";
  applyLanguage();
  if (!document.querySelector("#applicant").hidden) renderApplicant();
  if (!document.querySelector("#staff").hidden) renderStaff();
  save();
});
document.querySelector("#reset-demo").addEventListener("click", () => { try { sessionStorage.removeItem(key); } catch { /* Reset still reloads the in-memory demo. */ } window.location.reload(); });
form.addEventListener("input", save); form.addEventListener("change", save);
load(); applyLanguage(); renderFamily();
