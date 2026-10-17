import { siteConfig } from "/site-config.js";

const copy = {
  en: {
    skip: "Skip to content", navHow: "How it works", navService: "Pilot service", navFaq: "FAQ", navCta: "Talk to us",
    eyebrow: "A preparation service for Ethiopian applicants",
    heroTitle: 'A clearer way to prepare for the <em>Diversity Visa.</em>',
    heroLead: "A planned pilot will offer guided preparation, a completeness review, and practical photo feedback. You stay in control and submit your own entry through the official process.",
    heroCta: "Ask about the pilot", heroSecondary: "See how it works", trustOne: "You review every answer", trustTwo: "Clear service pricing", trustThree: "Amharic & English",
    artLabel: "YOUR PREPARATION", artTitle: "Take it one step at a time.", artProgress: "Your checklist", artItem1: "Read the current instructions", artItem2: "Prepare your information", artItem3: "Review your answers", artItem4: "Submit through the official site", artNote: "Your entry remains yours to review and submit.", chipPhoto: "Photo feedback", chipFamily: "Family checklist",
    notice: "The pilot is in preparation. Official dates and requirements can change, so we’ll use the latest U.S. Department of State instructions when they are available.", officialLink: "Official DV information ↗",
    howEyebrow: "A simple, applicant-led process", howTitle: "Help at the moments that matter.", howLead: "A small, focused pilot designed to make preparation easier without taking control away from you.",
    step1Title: "Prepare", step1Body: "Follow a clear checklist based on the official instructions for the current cycle.", step2Title: "Review together", step2Body: "We check your information for missing items and give you one chance to correct it.", step3Title: "Get photo feedback", step3Body: "Receive practical feedback on each required photo. Our checks are helpful guidance, not a guarantee of acceptance.", step4Title: "You stay in control", step4Body: "You approve your information and submit your entry yourself through the official site.",
    serviceEyebrow: "The first pilot", serviceTitle: "Thoughtful help, with clear boundaries.", serviceLead: "We’re starting with one preparation and review package for a small group of applicants.", serviceItem1: "Guided preparation using current official instructions", serviceItem2: "One human completeness review", serviceItem3: "Advisory photo feedback and one correction round", serviceItem4: "Support in Amharic or English through Telegram",
    priceLabel: "PROPOSED PILOT PRICE · NOT ACCEPTING PAYMENTS", priceNote: "A planning estimate only. We’ll confirm the final price and what’s included before enrollment.", feeService: "Ethio DV Assist service fee", feeManual: "Telebirr · manual verification planned", feeGov: "Any official government fee", feeSeparate: "Separate · paid by you directly", priceCta: "Ask about the pilot", priceFootnote: "Preview only: enrollment and service-fee payments are not open. We do not collect or facilitate government fees.",
    trustEyebrow: "Trust comes first", trustTitle: "Your information deserves care.", trustLead: "We’re building the service around clarity, consent, and the minimum information needed to help you prepare.", trustTitle1: "You approve your answers", trustBody1: "We won’t submit an official entry for you in the pilot.", trustTitle2: "No promises about selection", trustBody2: "Selection is outside our control. We help with preparation and review only.", trustTitle3: "Independent service", trustBody3: "Ethio DV Assist is not affiliated with the U.S. Government or the Department of State.", trustTitle4: "Preview only", trustBody4: "This page has no application form, and we are not accepting applicant documents or payments here.",
    faqEyebrow: "Good to know", faqTitle: "Questions, answered plainly.", faqQ1: "Are you the official DV website?", faqA1: "No. Ethio DV Assist is an independent preparation and review service. The official entry is made through the U.S. Department of State’s website.", faqQ2: "Will you submit my entry for me?", faqA2: "No. The pilot helps you prepare and review your information. You remain responsible for reviewing and submitting your own entry through the official process.", faqQ3: "Does your photo feedback guarantee acceptance?", faqA3: "No. Feedback can help identify possible issues, but it cannot guarantee that a photo will be accepted by the official system.", faqQ4: "What will I pay?", faqA4: "The service price is currently being validated and is expected to be near 1,500 ETB for the pilot. Any official fee is separate, is not collected by us, and must be paid directly through the official process if required.", faqQ5: "When can I join?", faqA5: "We’re preparing a small pilot. Contact us on Telegram for updates. Official dates and requirements are set by the Department of State and may change.",
    contactEyebrow: "Stay in the loop", contactTitle: "Have a question about the pilot?", contactLead: "Message us on Telegram. We’ll explain the preparation service, share updates, and let you know when the pilot is ready.", contactCta: "Message @Sahilumike", contactPrivacy: "Telegram opens separately. Please don’t send passwords, payment PINs or codes, or sensitive documents in chat.",
    footerNote: "Independent preparation support · Not affiliated with the U.S. Government", footerOfficial: "Official DV information ↗", footerDisclaimer: "Official requirements, dates, and fees can change. Always check the current instructions.",
  },
  am: {
    skip: "ወደ ዋናው ይዝለሉ", navHow: "አሰራሩ", navService: "የሙከራ አገልግሎት", navFaq: "ጥያቄዎች", navCta: "ያነጋግሩን",
    eyebrow: "ለኢትዮጵያውያን የዝግጅት እገዛ",
    heroTitle: 'ለዲቨርሲቲ ቪዛ በተሻለ ግልጽነት <em>ይዘጋጁ።</em>',
    heroLead: "የታቀደው የሙከራ አገልግሎት በመመሪያ የተደገፈ ዝግጅት፣ የሙሉነት ግምገማና ስለ ፎቶ ጠቃሚ ምክር ያቀርባል። ቁጥጥሩ በእጅዎ ይቆያል፤ ማመልከቻዎንም በይፋዊው ሂደት እርስዎ ያስገባሉ።",
    heroCta: "ስለ ሙከራው ይጠይቁ", heroSecondary: "አሰራሩን ይመልከቱ", trustOne: "እያንዳንዱን መልስ እርስዎ ያረጋግጣሉ", trustTwo: "ግልጽ የአገልግሎት ዋጋ", trustThree: "አማርኛ እና እንግሊዝኛ",
    artLabel: "የዝግጅትዎ ሂደት", artTitle: "ደረጃ በደረጃ ይሂዱ።", artProgress: "የዝግጅት ዝርዝር", artItem1: "የአሁኑን መመሪያ ያንብቡ", artItem2: "መረጃዎን ያዘጋጁ", artItem3: "መልሶችዎን ይገምግሙ", artItem4: "በይፋዊው ድረ-ገጽ ያስገቡ", artNote: "ማመልከቻዎን የሚገመግሙትና የሚያስገቡት እርስዎ ነዎት።", chipPhoto: "የፎቶ ምክር", chipFamily: "የቤተሰብ ዝርዝር",
    notice: "የሙከራ አገልግሎቱ በዝግጅት ላይ ነው። ይፋዊ ቀኖችና መስፈርቶች ሊለወጡ ስለሚችሉ፣ ሲገኙ የዩናይትድ ስቴትስ የውጭ ጉዳይ መምሪያን የአሁኑን መመሪያ እንከተላለን።", officialLink: "ይፋዊ የDV መረጃ ↗",
    howEyebrow: "ቀላል፣ በአመልካቹ ቁጥጥር ሥር የሚሆን ሂደት", howTitle: "በአስፈላጊዎቹ ደረጃዎች እገዛ።", howLead: "ዝግጅትዎን ለማቅለል የተዘጋጀ ትንሽ የሙከራ አገልግሎት፤ ቁጥጥሩን ከእርስዎ ሳይወስድ።",
    step1Title: "ይዘጋጁ", step1Body: "ለአሁኑ ዙር በይፋዊው መመሪያ ላይ የተመሠረተ ግልጽ ዝርዝር ይከተሉ።", step2Title: "አብረን እንገምግም", step2Body: "ያልተሟላ መረጃ ካለ እንፈትሻለን፤ እርስዎም አንድ ጊዜ እንዲያርሙ እድል እንሰጣለን።", step3Title: "ስለ ፎቶዎ ምክር ያግኙ", step3Body: "ለሚያስፈልጉ ፎቶዎች ጠቃሚ ምክር ያግኙ። ይህ መመሪያ ነው፤ መቀበሉን አያረጋግጥም።", step4Title: "ቁጥጥሩ በእጅዎ ይቆያል", step4Body: "መረጃዎን ያጸድቃሉ፤ ማመልከቻዎንም በይፋዊው ድረ-ገጽ እርስዎ ያስገባሉ።",
    serviceEyebrow: "የመጀመሪያው ሙከራ", serviceTitle: "ጠቃሚ እገዛ፣ ግልጽ ወሰን ያለው።", serviceLead: "ለጥቂት አመልካቾች በአንድ የዝግጅትና የግምገማ ጥቅል እንጀምራለን።", serviceItem1: "የአሁኑን ይፋዊ መመሪያ ተከትሎ የሚደረግ ዝግጅት", serviceItem2: "አንድ የሰው የመረጃ ሙሉነት ግምገማ", serviceItem3: "ስለ ፎቶ ምክርና አንድ የማስተካከያ ዙር", serviceItem4: "በቴሌግራም በአማርኛ ወይም በእንግሊዝኛ ድጋፍ",
    priceLabel: "የሙከራ ዋጋ ግምት · ክፍያ አንቀበልም", priceNote: "ለዕቅድ ብቻ የተቀመጠ ግምት ነው። ከምዝገባ በፊት የመጨረሻውን ዋጋና የሚካተቱትን እናሳውቃለን።", feeService: "የEthio DV Assist አገልግሎት ክፍያ", feeManual: "ቴሌብር · በእጅ ማረጋገጥ ታቅዷል", feeGov: "ማንኛውም ይፋዊ የመንግሥት ክፍያ", feeSeparate: "የተለየ · እርስዎ በቀጥታ ይከፍላሉ", priceCta: "ስለ ሙከራው ይጠይቁ", priceFootnote: "ቅድመ እይታ ብቻ ነው፤ ምዝገባና የአገልግሎት ክፍያ ገና አልተጀመሩም። የመንግሥት ክፍያ አንሰበስብም ወይም አናስተባብርም።",
    trustEyebrow: "መተማመን ቅድሚያ ነው", trustTitle: "መረጃዎ በጥንቃቄ ሊያዝ ይገባል።", trustLead: "አገልግሎቱን በግልጽነት፣ በፈቃድና ለዝግጅት የሚያስፈልገውን መረጃ ብቻ በመጠቀም እየገነባን ነው።", trustTitle1: "መልሶችዎን እርስዎ ያጸድቃሉ", trustBody1: "በሙከራው ወቅት ይፋዊ ማመልከቻ አናስገባም።", trustTitle2: "ስለ ምርጫ ቃል አንገባም", trustBody2: "ምርጫው ከእኛ ቁጥጥር ውጭ ነው። የምንረዳው በዝግጅትና በግምገማ ብቻ ነው።", trustTitle3: "ነጻ አገልግሎት", trustBody3: "Ethio DV Assist ከዩናይትድ ስቴትስ መንግሥት ወይም ከውጭ ጉዳይ መምሪያው ጋር የተቆራኘ አይደለም።", trustTitle4: "ቅድመ እይታ ብቻ", trustBody4: "ይህ ገጽ የማመልከቻ ቅጽ የለውም፤ የአመልካቾችን ሰነዶች ወይም ክፍያ እዚህ አንቀበልም።",
    faqEyebrow: "ማወቅ የሚጠቅሙ ነገሮች", faqTitle: "ጥያቄዎች፣ በግልጽ መልስ።", faqQ1: "ይህ ይፋዊው የDV ድረ-ገጽ ነው?", faqA1: "አይደለም። Ethio DV Assist ገለልተኛ የዝግጅትና የግምገማ አገልግሎት ነው። ይፋዊ ማመልከቻው በዩናይትድ ስቴትስ የውጭ ጉዳይ መምሪያ ድረ-ገጽ ይደረጋል።", faqQ2: "ማመልከቻዬን በእኔ ፈንታ ታስገባላችሁ?", faqA2: "አይደለም። ሙከራው መረጃዎን ለማዘጋጀትና ለመገምገም ይረዳዎታል። በይፋዊው ሂደት ማመልከቻዎን መገምገምና ማስገባት የእርስዎ ኃላፊነት ነው።", faqQ3: "የፎቶ ምክራችሁ መቀበሉን ያረጋግጣል?", faqA3: "አይደለም። ምክሩ ሊኖሩ የሚችሉ ችግሮችን ለመለየት ይረዳል፤ ይፋዊው ስርዓት ፎቶውን መቀበሉን ግን አያረጋግጥም።", faqQ4: "ምን ያህል እከፍላለሁ?", faqA4: "የአገልግሎቱ ዋጋ አሁን እየተገመገመ ነው፤ ለሙከራው ወደ 1,500 ብር እንደሚሆን ታስቧል። ማንኛውም ይፋዊ ክፍያ የተለየ ነው፤ እኛ አንሰበስብም፣ ካስፈለገም በይፋዊው ሂደት በቀጥታ ይከፍላሉ።", faqQ5: "መቼ መቀላቀል እችላለሁ?", faqA5: "ትንሽ የሙከራ አገልግሎት እያዘጋጀን ነው። ለዝማኔ በቴሌግራም ያነጋግሩን። ይፋዊ ቀኖችና መስፈርቶች በውጭ ጉዳይ መምሪያው ይወሰናሉ፤ ሊለወጡም ይችላሉ።",
    contactEyebrow: "ወቅታዊ መረጃ ያግኙ", contactTitle: "ስለ ሙከራው ጥያቄ አለዎት?", contactLead: "በቴሌግራም መልዕክት ይላኩልን። ስለ ዝግጅት አገልግሎቱ እናብራራለን፣ ዝማኔዎችንም እናጋራለን።", contactCta: "ለ @Sahilumike መልዕክት ይላኩ", contactPrivacy: "ቴሌግራም በተለየ ይከፈታል። እባክዎ የይለፍ ቃል፣ የክፍያ PIN/ኮድ ወይም ሚስጥራዊ ሰነዶችን በውይይት አይላኩ።",
    footerNote: "ገለልተኛ የዝግጅት ድጋፍ · ከዩናይትድ ስቴትስ መንግሥት ጋር የተቆራኘ አይደለም", footerOfficial: "ይፋዊ የDV መረጃ ↗", footerDisclaimer: "ይፋዊ መስፈርቶች፣ ቀኖችና ክፍያዎች ሊለወጡ ይችላሉ። የአሁኑን መመሪያ ሁልጊዜ ይመልከቱ።",
  },
};

let language = "en";
try {
  language = localStorage.getItem("ethio-dv-language") === "am" ? "am" : "en";
} catch {
  // Keep the page usable when the browser blocks local storage.
}
const toggle = document.querySelector("[data-language-toggle]");

function setLanguage(nextLanguage) {
  language = nextLanguage;
  document.documentElement.lang = language === "am" ? "am" : "en";
  document.body.classList.toggle("lang-am", language === "am");
  toggle.textContent = language === "am" ? "English" : "አማርኛ";
  for (const element of document.querySelectorAll("[data-i18n]")) {
    const value = copy[language][element.dataset.i18n];
    if (value === undefined) continue;
    if (value.includes("<em>")) element.innerHTML = value;
    else element.textContent = value;
  }
  try {
    localStorage.setItem("ethio-dv-language", language);
  } catch {
    // Language selection still applies for the current page view.
  }
}

toggle.addEventListener("click", () => setLanguage(language === "en" ? "am" : "en"));
setLanguage(language);
document.querySelector("[data-current-year]").textContent = new Date().getFullYear();
document.querySelector("[data-telegram-contact]").href = siteConfig.telegramUrl;

const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
menuToggle.addEventListener("click", () => {
  const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!isOpen));
  mobileMenu.hidden = isOpen;
});
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  menuToggle.setAttribute("aria-expanded", "false");
  mobileMenu.hidden = true;
}));

