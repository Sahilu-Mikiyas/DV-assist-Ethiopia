import './NextPhasesPanel.css'

export function NextPhasesPanel({ language }: { language: 'en' | 'am' }) {
  const en = language === 'en'
  return <section className="next-phases" aria-label={en ? 'Later phase previews' : 'የሚቀጥሉ ደረጃዎች ቅድመ እይታ'}>
    <article className="phase-gate-card">
      <p className="eyebrow">{en ? 'PHASE 10 · LOCKED' : 'ደረጃ 10 · የተቆለፈ'}</p>
      <h2>{en ? 'Secure closeout and confirmation' : 'ደህንነቱ የተጠበቀ መዝጊያና ማረጋገጫ'}</h2>
      <p>{en ? 'This demo does not submit an entry and cannot accept or store a confirmation number.' : 'ይህ ሙከራ ማመልከቻ አያስገባም፤ የማረጋገጫ ቁጥርም አይቀበልም ወይም አያስቀምጥም።'}</p>
      <ul><li>{en ? 'No government entry is made here.' : 'እዚህ ምንም የመንግሥት ማመልከቻ አይገባም።'}</li><li>{en ? 'A future vault requires an approved, verified workflow, applicant delivery, access audit, and deletion policy.' : 'ወደፊት የሚኖረው ማከማቻ የተፈቀደ ሂደት፣ ለአመልካች ማድረስ፣ የመዳረሻ ኦዲትና የማጥፋት ፖሊሲ ይፈልጋል።'}</li></ul>
      <span className="gate-status">{en ? 'Unavailable in preview' : 'በቅድመ እይታ ውስጥ አይገኝም'}</span>
    </article>
    <article className="phase-gate-card">
      <p className="eyebrow">{en ? 'PHASE 11 · NOT LAUNCH READY' : 'ደረጃ 11 · ለማስጀመር ዝግጁ አይደለም'}</p>
      <h2>{en ? 'Pilot readiness gates' : 'የሙከራ ዝግጁነት መስፈርቶች'}</h2>
      <p>{en ? 'This status panel is informational; it cannot approve or launch the service.' : 'ይህ ፓነል መረጃ ብቻ ነው፤ አገልግሎቱን አያጸድቅም ወይም አያስጀምርም።'}</p>
      <ul>{(en ? [
        'Verify the applicable DV-cycle rules and version the approved schema.',
        'Pass PostgreSQL integration, account isolation, MFA, audit, and restore checks.',
        'Approve privacy, consent, retention/deletion, pricing, and refund policies.',
        'Verify private photo storage/scanning and staff operating procedures before collection.',
        'Confirm support coverage, incident response, and applicant-facing translations.',
      ] : [
        'የDV ዙሩን መመሪያ አረጋግጦ የተፈቀደውን ቅጽ በስሪት ያስቀምጡ።',
        'የPostgreSQL ውህደት፣ የመለያ ጥበቃ፣ MFA፣ ኦዲትና የመመለስ ፍተሻዎችን ያልፉ።',
        'የግላዊነት፣ ፈቃድ፣ ማቆያ/ማጥፋት፣ ዋጋና ተመላሽ ፖሊሲዎችን ያጽድቁ።',
        'መረጃ ከመቀበል በፊት የፎቶ ማከማቻ/ምርመራና የሰራተኛ አሰራርን ያረጋግጡ።',
        'የድጋፍ ሽፋን፣ የክስተት ምላሽና የተተረጎሙ መልዕክቶችን ያረጋግጡ።',
      ]).map((item) => <li key={item}>{item}</li>)}</ul>
      <span className="gate-status">{en ? 'Blocked · demo only' : 'ተዘግቷል · ሙከራ ብቻ'}</span>
    </article>
    <article className="phase-gate-card results-card">
      <p className="eyebrow">{en ? 'PHASE 12 · SELF-SERVICE HELPER' : 'ደረጃ 12 · በራስ አገልግሎት እገዛ'}</p>
      <h2>{en ? 'Check results yourself' : 'ውጤቱን እራስዎ ያረጋግጡ'}</h2>
      <p>{en ? 'The Department of State says Entrant Status Check is the official way to learn a DV selection result. This helper does not ask for your confirmation number or check results for you. Selection is not a visa guarantee.' : 'የውጭ ጉዳይ መምሪያው የDV ውጤትን ለማወቅ Entrant Status Check ይፋዊ መንገድ መሆኑን ይገልጻል። ይህ እገዛ የማረጋገጫ ቁጥርዎን አይጠይቅም ወይም ውጤትዎን አያረጋግጥም። መመረጥ ቪዛ ዋስትና አይደለም።'}</p>
      <a className="primary result-link" href="https://dvprogram.state.gov/ESC/" target="_blank" rel="noreferrer">{en ? 'Open official Entrant Status Check' : 'ይፋዊ Entrant Status Checkን ክፈት'} ↗</a>
    </article>
  </section>
}
