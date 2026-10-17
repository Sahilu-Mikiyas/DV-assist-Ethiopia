import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react'
import { Phase3Portal } from './Phase3Portal'
import { SchemaWizard } from './SchemaWizard'
import { clearSchemaWizardDraft } from './schemaStorage'
import './App.css'

type Lang = 'en' | 'am'
type Step = 0 | 1 | 2 | 3
type FamilyMember = { id: string; name: string; relation: 'Spouse' | 'Child' | 'Stepchild' | 'Adopted child'; birthDate: string }
type CaseStatus = 'In preparation' | 'Needs review' | 'Ready for applicant' | 'Closed'
type DemoCase = { id: string; name: string; language: string; status: CaseStatus; note: string }
type Draft = { givenName: string; lastName: string; birthDate: string; birthCity: string; birthCountry: string; eligibility: string; email: string; education: string; marital: string }
type SavedState = { lang?: Lang; step?: Step; draft?: Draft; family?: FamilyMember[]; checks?: boolean[]; approvedAt?: string; cases?: DemoCase[] }

const storageKey = 'ethio-dv-demo-react-v1'
const seedCases: DemoCase[] = [
  { id: 'DEMO-1042', name: 'Aster Example', language: 'Amharic', status: 'Needs review', note: 'Confirm the fictional profile is complete.' },
  { id: 'DEMO-1041', name: 'Bekele Sample', language: 'English', status: 'In preparation', note: '' },
  { id: 'DEMO-1040', name: 'Hana Placeholder', language: 'Amharic', status: 'Ready for applicant', note: 'Demo case only.' },
]
const defaultDraft: Draft = { givenName: 'Demo', lastName: 'Applicant', birthDate: '1998-04-12', birthCity: 'Addis Ababa', birthCountry: 'Ethiopia', eligibility: 'Ethiopia', email: 'demo@example.invalid', education: 'High school', marital: 'Married' }
const initialFamily: FamilyMember[] = [
  { id: 'F1', name: 'Example Spouse', relation: 'Spouse', birthDate: '1997-07-09' },
  { id: 'F2', name: 'Example Child', relation: 'Child', birthDate: '2018-05-20' },
]

const text = {
  en: {
    brand: 'Ethio DV Assist', demo: 'INTERACTIVE DEMO', exit: 'Exit demo', warning: 'DEMO ENVIRONMENT: use synthetic information only. Do not enter real applicant details, upload real photos or documents, or make payments. Nothing is submitted to the government.', homeEyebrow: 'PREVIEW WORKSPACE', homeTitle: 'Explore the preparation flow', homeBody: 'This preview has a synthetic schema wizard and tab-local staff demo. Account features need the local Go API and PostgreSQL. DV-2027 questions are not published.', schemaEyebrow: 'PHASE 4 · SYNTHETIC ONLY', schemaTitle: 'Schema engine sample', applicantDemo: 'Open schema wizard sample', staffDemo: 'View staff demo', reset: 'Reset demo data', apiOnline: 'Go API is reachable', apiOffline: 'Go API is not reachable', applicantSpace: 'APPLICANT WORKSPACE · SYNTHETIC DATA', prepare: 'Prepare your draft', home: '← Demo home', stepPersonal: '1 · Personal', stepFamily: '2 · Family', stepPhoto: '3 · Photo & checklist', stepReview: '4 · Review', stepOf: 'Step {n} of 4', saved: 'Saved in this tab only', personal: 'PERSONAL DETAILS', sample: 'Start with a sample profile', fictional: 'Pre-filled with fictional data', given: 'Given name', last: 'Last name', dob: 'Date of birth', city: 'City of birth', birthCountry: 'Country of birth', eligibility: 'Country of eligibility', email: 'Email (sample only)', education: 'Education level', highschool: 'High school', university: 'University degree', otherEducation: 'Other / unknown', marital: 'Marital status', single: 'Single', married: 'Married', ethiopia: 'Ethiopia', other: 'Other', fieldsNote: 'Illustrative fields only. We have not confirmed the current DV cycle form requirements.', familySection: 'FAMILY CHECKLIST', familyTitle: 'Review the family section', fictionalRows: 'Editable fictional rows', rulesPending: 'Cycle rules not confirmed', familyRules: 'Official household requirements can change. This prototype does not decide who must be included. Check current official instructions before preparing a real entry.', addSpouse: '＋ Add fictional spouse', addChild: '＋ Add fictional child', relation: 'Relationship', familyName: 'Fictional name', familyDob: 'Date of birth (sample)', remove: 'Remove row', photoSection: 'PHOTO & COMPLETENESS', checklist: 'Review the checklist', noUpload: 'No photo upload in demo', photoNotBuilt: 'Photo review is not implemented here', photoRules: 'This demo does not accept or analyze photos. Current criteria and per-family-member photo requirements must be checked in the official instructions for the applicable cycle.', checkOfficial: 'I would check the current official instructions first.', checkFamily: 'I would confirm every required family member is listed.', checkPhotos: 'I would prepare a recent photo for everyone required by current instructions.', photoDisclaimer: 'Planned photo feedback is advisory and reviewed by a person. It would not guarantee acceptance.', reviewSection: 'REVIEW & APPROVAL', reviewTitle: 'Review the sample draft', notOfficial: 'Not an official application', applicantControl: 'Applicant control', controlBody: 'The applicant should check every answer and submit their own official entry. Ethio DV Assist does not submit entries in this pilot.', consent: 'I reviewed this fictional demo summary and understand it is not submitted anywhere.', approve: 'Approve demo summary', approved: 'Demo approval recorded in this tab. Nothing was submitted.', consentRequired: 'Check the demo consent box to continue.', previous: '← Previous', next: 'Continue →', staffSpace: 'STAFF WORKSPACE · FICTIONAL CASES', queue: 'Case queue', openCases: 'OPEN DEMO CASES', waiting: 'WAITING FOR REVIEW', payment: 'PAYMENT', notConnected: 'Not connected', fictionalCase: 'Fictional case', caseSelect: 'Select a demo case', caseSelectBody: 'Explore status updates and fictional internal notes.', status: 'Demo status', note: 'Internal demo note', notePlaceholder: 'Type a fictional internal note', saveChanges: 'Save demo changes', inPreparation: 'In preparation', needsReview: 'Needs review', readyApplicant: 'Ready for applicant', closed: 'Closed', staffNote: 'All names and cases are fictional. Status changes and notes stay in this browser tab and reset when you close the demo.', footer: 'Local interactive demo · No government affiliation · No real applicant data', name: 'Name', birthplace: 'Birthplace', familyCount: 'Fictional family members', relationSpouse: 'Spouse', relationChild: 'Child', relationStep: 'Stepchild', relationAdopted: 'Adopted child', noFamily: 'No fictional family rows added.', spouseNeedsMarried: 'Change marital status to Married before adding a spouse.', spouseExists: 'A spouse sample is already included.', apiChecking: 'Checking Go API…', apiUnknown: 'Go API status unknown', storageNotice: 'Session storage unavailable; keep this tab open.',
  },
  am: {
    brand: 'Ethio DV Assist', demo: 'ተግባራዊ ሙከራ', exit: 'ከሙከራው ውጣ', warning: 'የሙከራ አካባቢ፦ ምናባዊ መረጃ ብቻ ይጠቀሙ። እውነተኛ የአመልካች መረጃ አያስገቡ፣ እውነተኛ ፎቶ ወይም ሰነድ አይጫኑ፣ ክፍያም አይፈጽሙ። ለመንግሥት ምንም አይላክም።', homeEyebrow: 'የቅድመ እይታ ቦታ', homeTitle: 'የዝግጅት ሂደቱን ይመልከቱ', homeBody: 'ይህ ቅድመ እይታ ምናባዊ የቅጽ እቅድ ማሳያና በአሳሽ ታብ ብቻ የሚቆይ የሰራተኛ ሙከራ ያሳያል። የመለያ ባህሪያት የGo APIና PostgreSQL ይፈልጋሉ። የDV-2027 ጥያቄዎች ገና አልታተሙም።', schemaEyebrow: 'ደረጃ 4 · ምናባዊ ምሳሌ ብቻ', schemaTitle: 'የእቅድ ማሳያ ምሳሌ', applicantDemo: 'የቅጽ እቅድ ምሳሌን ክፈት', staffDemo: 'የሰራተኛ ሙከራን አሳይ', reset: 'የሙከራ መረጃን አጥፋ', apiOnline: 'የGo API ተደራሽ ነው', apiOffline: 'የGo API ተደራሽ አይደለም', applicantSpace: 'የአመልካች ቦታ · ምናባዊ መረጃ', prepare: 'ረቂቅዎን ያዘጋጁ', home: '← ወደ ሙከራው መነሻ', stepPersonal: '1 · የግል መረጃ', stepFamily: '2 · ቤተሰብ', stepPhoto: '3 · ፎቶና ዝርዝር', stepReview: '4 · ግምገማ', stepOf: 'ደረጃ {n} ከ4', saved: 'በዚህ ታብ ብቻ ተቀምጧል', personal: 'የግል መረጃ', sample: 'የምሳሌ መረጃ ይጀምሩ', fictional: 'በምናባዊ መረጃ የተሞላ', given: 'የመጀመሪያ ስም', last: 'የአባት ስም', dob: 'የትውልድ ቀን', city: 'የትውልድ ከተማ', birthCountry: 'የትውልድ አገር', eligibility: 'የብቁነት አገር', email: 'ኢሜይል (ለምሳሌ ብቻ)', education: 'የትምህርት ደረጃ', highschool: 'ሁለተኛ ደረጃ', university: 'የዩኒቨርሲቲ ዲግሪ', otherEducation: 'ሌላ / ያልታወቀ', marital: 'የጋብቻ ሁኔታ', single: 'ያላገባ/ያላገባች', married: 'ያገባ/ያገባች', ethiopia: 'ኢትዮጵያ', other: 'ሌላ', fieldsNote: 'ለማብራሪያ ብቻ የቀረቡ መስኮች ናቸው። የአሁኑ የDV ዙር ቅጽ መስፈርቶች አልተረጋገጡም።', familySection: 'የቤተሰብ ዝርዝር', familyTitle: 'የቤተሰብ ክፍሉን ይመልከቱ', fictionalRows: 'ሊቀየሩ የሚችሉ ምናባዊ መስመሮች', rulesPending: 'የዙሩ መመሪያዎች አልተረጋገጡም', familyRules: 'ይፋዊ የቤተሰብ መስፈርቶች ሊለወጡ ይችላሉ። ይህ ምሳሌ ማን መካተት እንዳለበት አይወስንም። እውነተኛ ማመልከቻ ከማዘጋጀት በፊት የአሁኑን ይፋዊ መመሪያ ያረጋግጡ።', addSpouse: '＋ ምናባዊ የትዳር ጓደኛ ጨምር', addChild: '＋ ምናባዊ ልጅ ጨምር', relation: 'ዝምድና', familyName: 'ምናባዊ ስም', familyDob: 'የትውልድ ቀን (ምሳሌ)', remove: 'መስመሩን አስወግድ', photoSection: 'ፎቶና ሙሉነት', checklist: 'ዝርዝሩን ይመልከቱ', noUpload: 'በሙከራው ፎቶ አይጫንም', photoNotBuilt: 'የፎቶ ግምገማ እዚህ አልተገነባም', photoRules: 'ይህ ሙከራ ፎቶ አይቀበልም ወይም አይመረምርም። የአሁኑ መስፈርቶችና ለእያንዳንዱ የቤተሰብ አባል የፎቶ መመሪያ በይፋዊው የዙሩ መመሪያ መረጋገጥ አለበት።', checkOfficial: 'መጀመሪያ የአሁኑን ይፋዊ መመሪያ አረጋግጣለሁ።', checkFamily: 'መካተት ያለባቸው የቤተሰብ አባላት መዘርዘራቸውን አረጋግጣለሁ።', checkPhotos: 'በአሁኑ መመሪያ ለሚጠየቅ ሰው ሁሉ የቅርብ ጊዜ ፎቶ አዘጋጃለሁ።', photoDisclaimer: 'ታቅዶ የተዘጋጀው የፎቶ ምክር መመሪያ ብቻ ነው፣ በሰውም ይገመገማል። መቀበሉን አያረጋግጥም።', reviewSection: 'ግምገማና ማጽደቅ', reviewTitle: 'የምሳሌ ረቂቁን ይመልከቱ', notOfficial: 'ይፋዊ ማመልከቻ አይደለም', applicantControl: 'ቁጥጥሩ በአመልካቹ እጅ', controlBody: 'አመልካቹ እያንዳንዱን መልስ አረጋግጦ የራሱን ይፋዊ ማመልከቻ ማስገባት አለበት። Ethio DV Assist በዚህ ሙከራ ማመልከቻ አያስገባም።', consent: 'ይህን ምናባዊ የሙከራ ማጠቃለያ መርምሬያለሁ፤ ወደ ሌላ ቦታ እንደማይላክም ተረድቻለሁ።', approve: 'የሙከራ ማጠቃለያን አጽድቅ', approved: 'የሙከራ ማጽደቁ በዚህ ታብ ተመዝግቧል። ምንም አልተላከም።', consentRequired: 'ለመቀጠል የሙከራውን ፈቃድ ምልክት ያድርጉ።', previous: '← ቀዳሚ', next: 'ቀጥል →', staffSpace: 'የሰራተኛ ቦታ · ምናባዊ ጉዳዮች', queue: 'የጉዳይ ዝርዝር', openCases: 'ክፍት የሙከራ ጉዳዮች', waiting: 'ግምገማ የሚጠብቁ', payment: 'ክፍያ', notConnected: 'አልተገናኘም', fictionalCase: 'ምናባዊ ጉዳይ', caseSelect: 'የሙከራ ጉዳይ ይምረጡ', caseSelectBody: 'የሁኔታ ለውጦችንና ምናባዊ የውስጥ ማስታወሻዎችን ይመልከቱ።', status: 'የሙከራ ሁኔታ', note: 'የሙከራ የውስጥ ማስታወሻ', notePlaceholder: 'ምናባዊ የውስጥ ማስታወሻ ይጻፉ', saveChanges: 'የሙከራ ለውጦችን አስቀምጥ', inPreparation: 'በዝግጅት ላይ', needsReview: 'ግምገማ ያስፈልጋል', readyApplicant: 'ለአመልካቹ ዝግጁ', closed: 'ተዘግቷል', staffNote: 'ሁሉም ስሞችና ጉዳዮች ምናባዊ ናቸው። የሁኔታ ለውጦችና ማስታወሻዎች በዚህ የአሳሽ ታብ ብቻ ይቆያሉ፤ ሙከራውን ሲዘጉ ይጠፋሉ።', footer: 'የአካባቢ ተግባራዊ ሙከራ · ከመንግሥት ጋር የተቆራኘ አይደለም · እውነተኛ የአመልካች መረጃ የለም', name: 'ስም', birthplace: 'የትውልድ ቦታ', familyCount: 'ምናባዊ የቤተሰብ አባላት', relationSpouse: 'የትዳር ጓደኛ', relationChild: 'ልጅ', relationStep: 'የእንጀራ ልጅ', relationAdopted: 'የማደጎ ልጅ', noFamily: 'ምናባዊ የቤተሰብ መስመር የለም።', spouseNeedsMarried: 'የትዳር ጓደኛ ለመጨመር የጋብቻ ሁኔታን ወደ ያገባ ይቀይሩ።', spouseExists: 'ምናባዊ የትዳር ጓደኛ አስቀድሞ ተጨምሯል።', apiChecking: 'የGo API እየተፈተሸ ነው…', apiUnknown: 'የGo API ሁኔታ አይታወቅም', storageNotice: 'ጊዜያዊ ማስቀመጥ አልተሳካም፤ ይህን ታብ ክፍት ያድርጉ.',
  },
} satisfies Record<Lang, Record<string, string>>

function readSaved(): SavedState {
  try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}') as SavedState } catch { return {} }
}

function App() {
  const [saved] = useState(readSaved)
  const [lang, setLang] = useState<Lang>(saved.lang || 'en')
  const [view, setView] = useState<'home' | 'applicant' | 'staff' | 'schema'>('home')
  const [step, setStep] = useState<Step>(saved.step || 0)
  const [draft, setDraft] = useState<Draft>({ ...defaultDraft, ...saved.draft })
  const [family, setFamily] = useState<FamilyMember[]>(saved.family || initialFamily)
  const [checks, setChecks] = useState<boolean[]>(saved.checks || [false, false, false])
  const [approvedAt, setApprovedAt] = useState(saved.approvedAt || '')
  const [cases, setCases] = useState<DemoCase[]>(saved.cases || seedCases)
  const [demoCasesLoaded, setDemoCasesLoaded] = useState(false)
  const [activeCase, setActiveCase] = useState('')
  const [queueSearch, setQueueSearch] = useState('')
  const [queueFilter, setQueueFilter] = useState<'All' | CaseStatus>('All')
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState('')
  const [apiState, setApiState] = useState<'checking' | 'online' | 'offline'>('checking')
  const [storageAvailable, setStorageAvailable] = useState(true)
  const t = (key: string, vars?: Record<string, string>) => {
    let result = text[lang][key as keyof typeof text.en] || text.en[key as keyof typeof text.en] || key
    for (const [name, value] of Object.entries(vars || {})) result = result.replace(`{${name}}`, value)
    return result
  }

  useEffect(() => {
    document.documentElement.lang = lang
    try { sessionStorage.setItem(storageKey, JSON.stringify({ lang, step, draft, family, checks, approvedAt, cases })) }
    catch { window.setTimeout(() => setStorageAvailable(false), 0) }
  }, [lang, step, draft, family, checks, approvedAt, cases])

  useEffect(() => {
    fetch('/healthz', { headers: { Accept: 'application/json' } })
      .then((response) => { if (!response.ok) throw new Error('health endpoint unavailable'); return response.json() })
      .then((body: { status?: string }) => setApiState(body.status === 'ok' ? 'online' : 'offline'))
      .catch(() => setApiState('offline'))
  }, [])

  useEffect(() => {
    if (view !== 'staff' || demoCasesLoaded) return
    const controller = new AbortController()
    fetch('/api/v1/demo/cases', { headers: { Accept: 'application/json' }, signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('demo cases unavailable'); return response.json() })
      .then((body: { items?: DemoCase[] }) => {
        if (Array.isArray(body.items)) setCases(body.items)
        setDemoCasesLoaded(true)
      })
      .catch((cause: unknown) => {
        if (!(cause instanceof DOMException && cause.name === 'AbortError')) setDemoCasesLoaded(true)
      })
    return () => controller.abort()
  }, [view, demoCasesLoaded])

  const updateDraft = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setDraft((current) => ({ ...current, [event.target.name]: event.target.value }))
    setApprovedAt('')
  }
  const updateFamily = (id: string, key: keyof FamilyMember, value: string) => {
    setFamily((current) => current.map((person) => person.id === id ? { ...person, [key]: value } as FamilyMember : person))
    setApprovedAt('')
  }
  const addFamily = (relation: FamilyMember['relation']) => {
    if (relation === 'Spouse' && (draft.marital !== 'Married' || family.some((person) => person.relation === 'Spouse'))) return
    setFamily((current) => [...current, { id: crypto.randomUUID(), name: relation === 'Spouse' ? 'Example Spouse' : `Example ${relation} ${current.length}`, relation, birthDate: '2018-05-20' }])
  }
  const goNext = () => {
    if (step === 0 && (!draft.givenName.trim() || !draft.lastName.trim() || !draft.birthDate || !draft.birthCity.trim() || !draft.email.trim())) {
      setError(lang === 'am' ? 'እባክዎ የሚያስፈልጉትን መስኮች ይሙሉ።' : 'Complete the required sample fields to continue.')
      return
    }
    setError('')
    setApprovedAt('')
    setStep((current) => Math.min(3, current + 1) as Step)
  }
  const reset = () => { sessionStorage.removeItem(storageKey); clearSchemaWizardDraft(); window.location.reload() }
  const approve = () => {
    if (!consent) { setError(t('consentRequired')); return }
    setError(''); setApprovedAt(new Date().toISOString())
  }
  const formatStatus = (status: CaseStatus) => {
    const statusKeys: Record<CaseStatus, string> = { 'In preparation': 'inPreparation', 'Needs review': 'needsReview', 'Ready for applicant': 'readyApplicant', Closed: 'closed' }
    return t(statusKeys[status])
  }
  const visibleCases = cases.filter((item) => (queueFilter === 'All' || item.status === queueFilter) && `${item.name} ${item.id} ${item.language}`.toLowerCase().includes(queueSearch.trim().toLowerCase()))
  const active = visibleCases.find((item) => item.id === activeCase)

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="/"><span className="mark">E</span><span>Ethio <b>DV Assist</b></span></a>
      <div className="top-actions"><span className="demo-badge">{t('demo')}</span><button className="language" type="button" onClick={() => setLang((current) => current === 'en' ? 'am' : 'en')}>{lang === 'en' ? 'አማርኛ' : 'English'}</button><a className="quiet" href="/">{t('exit')}</a></div>
    </header>
    <div className="demo-warning" role="note"><strong>{t('warning')}</strong></div>

    <main className="shell">
      {view === 'home' && <section className="welcome">
        <div><p className="eyebrow">{t('homeEyebrow')}</p><h1>{t('homeTitle')}</h1><p className="lead">{t('homeBody')}</p>
          <p className={`api-status ${apiState}`}><i />{t(apiState === 'online' ? 'apiOnline' : apiState === 'offline' ? 'apiOffline' : 'apiChecking')}</p>
        </div>
        <div className="welcome-actions"><button className="primary" onClick={() => setView('schema')}>{t('applicantDemo')} <span>→</span></button><button className="secondary" onClick={() => setView('staff')}>{t('staffDemo')}</button><button className="text-button" onClick={reset}>{t('reset')}</button></div>
      </section>}
      {view === 'home' && <Phase3Portal lang={lang} />}

      {view === 'schema' && <SchemaWizard language={lang} onClose={() => setView('home')} />}

      {view === 'applicant' && <section className="workspace">
        <div className="workspace-heading"><div><p className="eyebrow">{t('applicantSpace')}</p><h1>{t('prepare')}</h1></div><button className="secondary" onClick={() => setView('home')}>{t('home')}</button></div>
        <div className="progress-card"><div className="progress-meta"><span>{t('stepOf', { n: String(step + 1) })}</span><span>{storageAvailable ? t('saved') : t('storageNotice')}</span></div><div className="progress-track"><span style={{ width: `${(step + 1) * 25}%` }} /></div><div className="steps">{(['stepPersonal', 'stepFamily', 'stepPhoto', 'stepReview'] as const).map((label, index) => <span key={label} className={`step${index === step ? ' active' : index < step ? ' complete' : ''}`}>{t(label)}</span>)}</div></div>
        {step === 0 && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">{t('personal')}</p><h2>{t('sample')}</h2></div><span className="sample-chip">{t('fictional')}</span></div>
          <div className="field-grid">
            <Field label={t('given')}><input name="givenName" value={draft.givenName} onChange={updateDraft} /></Field>
            <Field label={t('last')}><input name="lastName" value={draft.lastName} onChange={updateDraft} /></Field>
            <Field label={t('dob')}><input type="date" name="birthDate" value={draft.birthDate} onChange={updateDraft} /></Field>
            <Field label={t('city')}><input name="birthCity" value={draft.birthCity} onChange={updateDraft} /></Field>
            <Field label={t('birthCountry')}><select name="birthCountry" value={draft.birthCountry} onChange={updateDraft}><option value="Ethiopia">{t('ethiopia')}</option><option value="Other">{t('other')}</option></select></Field>
            <Field label={t('eligibility')}><select name="eligibility" value={draft.eligibility} onChange={updateDraft}><option value="Ethiopia">{t('ethiopia')}</option><option value="Other">{t('other')}</option></select></Field>
            <Field label={t('email')}><input type="email" name="email" value={draft.email} onChange={updateDraft} /></Field>
            <Field label={t('education')}><select name="education" value={draft.education} onChange={updateDraft}><option value="High school">{t('highschool')}</option><option value="University degree">{t('university')}</option><option value="Other / unknown">{t('otherEducation')}</option></select></Field>
            <Field label={t('marital')}><select name="marital" value={draft.marital} onChange={(event) => { updateDraft(event); setFamily((current) => current) }}><option value="Single">{t('single')}</option><option value="Married">{t('married')}</option></select></Field>
          </div><p className="field-note">{t('fieldsNote')}</p>
        </section>}

        {step === 1 && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">{t('familySection')}</p><h2>{t('familyTitle')}</h2></div><span className="sample-chip">{t('fictionalRows')}</span></div>
          <div className="notice-card"><strong>{t('rulesPending')}</strong><p>{t('familyRules')}</p></div>
          {draft.marital !== 'Married' && <p className="field-note">{t('spouseNeedsMarried')}</p>}
          {family.map((person) => <article key={person.id} className="family-card">
            <div className="family-card-head"><strong>{person.relation === 'Spouse' ? t('relationSpouse') : person.relation === 'Stepchild' ? t('relationStep') : person.relation === 'Adopted child' ? t('relationAdopted') : t('relationChild')}</strong><button className="text-button" onClick={() => setFamily((current) => current.filter((item) => item.id !== person.id))}>{t('remove')}</button></div>
            <div className="family-fields"><Field label={t('familyName')}><input value={person.name} maxLength={80} onChange={(event) => updateFamily(person.id, 'name', event.target.value)} /></Field><Field label={t('relation')}><select value={person.relation} onChange={(event) => updateFamily(person.id, 'relation', event.target.value)}><option value="Spouse">{t('relationSpouse')}</option><option value="Child">{t('relationChild')}</option><option value="Stepchild">{t('relationStep')}</option><option value="Adopted child">{t('relationAdopted')}</option></select></Field><Field label={t('familyDob')}><input type="date" value={person.birthDate} onChange={(event) => updateFamily(person.id, 'birthDate', event.target.value)} /></Field></div>
          </article>)}
          {!family.length && <p className="field-note">{t('noFamily')}</p>}
          <div className="family-actions"><button className="secondary" disabled={draft.marital !== 'Married' || family.some((person) => person.relation === 'Spouse')} onClick={() => addFamily('Spouse')}>{t('addSpouse')}</button><button className="secondary" onClick={() => addFamily('Child')}>{t('addChild')}</button><button className="secondary" onClick={() => addFamily('Stepchild')}>{lang === 'am' ? '＋ የእንጀራ ልጅ ጨምር' : '＋ Add stepchild'}</button><button className="secondary" onClick={() => addFamily('Adopted child')}>{lang === 'am' ? '＋ የማደጎ ልጅ ጨምር' : '＋ Add adopted child'}</button></div>
        </section>}

        {step === 2 && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">{t('photoSection')}</p><h2>{t('checklist')}</h2></div><span className="sample-chip">{t('noUpload')}</span></div>
          <div className="notice-card"><strong>{t('photoNotBuilt')}</strong><p>{t('photoRules')}</p></div>
          <div className="checklist">{(['checkOfficial', 'checkFamily', 'checkPhotos'] as const).map((label, index) => <label key={label}><input type="checkbox" checked={checks[index]} onChange={(event) => setChecks((current) => current.map((value, i) => i === index ? event.target.checked : value))} /><span>{t(label)}</span></label>)}</div>
          <p className="field-note">{t('photoDisclaimer')}</p>
        </section>}

        {step === 3 && <section className="panel"><div className="panel-heading"><div><p className="eyebrow">{t('reviewSection')}</p><h2>{t('reviewTitle')}</h2></div><span className="sample-chip">{t('notOfficial')}</span></div>
          <div className="review-grid">{[[t('name'), `${draft.givenName} ${draft.lastName}`], [t('dob'), draft.birthDate], [t('birthplace'), `${draft.birthCity}, ${draft.birthCountry}`], [t('eligibility'), draft.eligibility], [t('email'), draft.email], [t('education'), draft.education], [t('marital'), draft.marital], [t('familyCount'), family.map((person) => `${person.name} (${person.relation})`).join(', ') || '—']].map(([label, value]) => <div className="review-item" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          <div className="notice-card"><strong>{t('applicantControl')}</strong><p>{t('controlBody')}</p></div>
          <label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span>{t('consent')}</span></label>
          {error && <p className="error" role="alert">{error}</p>}
          {approvedAt && <p className="approved" role="status">{t('approved')} <time dateTime={approvedAt}>{new Date(approvedAt).toLocaleString(lang === 'am' ? 'am-ET' : 'en-ET')}</time></p>}
          <button className="primary approve-button" onClick={approve}>{t('approve')}</button>
        </section>}
        {error && step !== 3 && <p className="error" role="alert">{error}</p>}
        <div className="form-actions"><button className="secondary" hidden={step === 0} onClick={() => { setError(''); setStep((current) => Math.max(0, current - 1) as Step) }}>{t('previous')}</button><span className="autosave">{storageAvailable ? t('saved') : t('storageNotice')}</span><button className="primary" hidden={step === 3} onClick={goNext}>{t('next')}</button></div>
      </section>}

      {view === 'staff' && <section className="workspace"><div className="workspace-heading"><div><p className="eyebrow">{t('staffSpace')}</p><h1>{t('queue')}</h1></div><button className="secondary" onClick={() => setView('home')}>{t('home')}</button></div>
        <div className="staff-summary"><article><span>{t('openCases')}</span><strong>{cases.filter((item) => item.status !== 'Closed').length}</strong></article><article><span>{t('waiting')}</span><strong>{cases.filter((item) => item.status === 'Needs review').length}</strong></article><article><span>{t('payment')}</span><strong>{t('notConnected')}</strong></article></div>
        <div className="queue-controls"><label><span>{lang === 'am' ? 'ምናባዊ ጉዳዮችን ፈልግ' : 'Search fictional cases'}</span><input type="search" value={queueSearch} onChange={(event) => setQueueSearch(event.target.value)} placeholder={lang === 'am' ? 'ስም፣ መለያ ወይም ቋንቋ' : 'Name, case ID, or language'} /></label><label><span>{lang === 'am' ? 'በሁኔታ አጣራ' : 'Filter by status'}</span><select value={queueFilter} onChange={(event) => setQueueFilter(event.target.value as 'All' | CaseStatus)}><option value="All">{lang === 'am' ? 'ሁሉም ሁኔታዎች' : 'All statuses'}</option><option value="In preparation">{t('inPreparation')}</option><option value="Needs review">{t('needsReview')}</option><option value="Ready for applicant">{t('readyApplicant')}</option><option value="Closed">{t('closed')}</option></select></label><span className="queue-count">{visibleCases.length} / {cases.length}</span></div>
        <div className="staff-layout"><div className="case-list">{visibleCases.length ? visibleCases.map((item) => <button key={item.id} className={`case-row${item.id === activeCase ? ' selected' : ''}`} onClick={() => setActiveCase(item.id)}><span><strong>{item.name}</strong><small>{item.id} · {t('fictionalCase')}</small></span><span className="status-pill">{formatStatus(item.status)}</span></button>) : <p className="queue-empty">{lang === 'am' ? 'ከዚህ ማጣሪያ ጋር የሚዛመድ ምናባዊ ጉዳይ የለም።' : 'No fictional cases match these filters.'}</p>}</div>
          <aside className="case-detail">{!active ? <div className="empty-state"><span>◎</span><h2>{t('caseSelect')}</h2><p>{t('caseSelectBody')}</p></div> : <><h2>{active.name}</h2><p className="field-note">{active.id} · {active.language} · {t('fictionalCase')}</p><Field label={t('status')}><select value={active.status} onChange={(event) => setCases((current) => current.map((item) => item.id === active.id ? { ...item, status: event.target.value as CaseStatus } : item))}><option value="In preparation">{t('inPreparation')}</option><option value="Needs review">{t('needsReview')}</option><option value="Ready for applicant">{t('readyApplicant')}</option><option value="Closed">{t('closed')}</option></select></Field><Field label={t('note')}><textarea rows={4} maxLength={280} placeholder={t('notePlaceholder')} value={active.note} onChange={(event) => setCases((current) => current.map((item) => item.id === active.id ? { ...item, note: event.target.value } : item))} /></Field></>}</aside>
        </div><p className="field-note">{t('staffNote')}</p>
      </section>}
    </main>
    <footer>{t('footer')}</footer>
  </div>
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="field-label"><span>{label}</span>{children}</label>
}

export default App
