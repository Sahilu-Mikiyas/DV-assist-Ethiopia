import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import sample from '../../../config/dv-cycles/schema-demo.json'
import cycle from '../../../config/dv-cycles/dv-2027.json'
import { schemaDraftStorageKey } from './schemaStorage'
import './SchemaWizard.css'

type Language = 'en' | 'am'
type Localized = Record<Language, string>
type Field = {
  id: string
  type: 'text' | 'textarea' | 'date' | 'select' | 'boolean'
  label: Localized
  help?: Localized
  required: boolean
  maxLength?: number
  options?: Array<{ value: string; label: Localized }>
  visibleWhen?: { field: string; equals: unknown }
}
type RepeatableGroup = { id: string; title: Localized; help: Localized; minItems: number; maxItems: number; uniqueField: string; fields: Field[] }
type RecordRow = Record<string, unknown> & { recordId: string }
type Section = { id: string; title: Localized; description: Localized; fields: Field[]; repeatableGroups?: RepeatableGroup[] }
type FormConfig = { schemaVersion: number; configVersion: number; title: Localized; description: Localized; sections: Section[] }

const config = sample as FormConfig
const cycleConfig = cycle as { cycle: string; status: string; sections: unknown[] }

function clearHiddenValues(values: Record<string, unknown>): Record<string, unknown> {
  const next = { ...values }
  for (const section of config.sections) {
    for (const field of section.fields) {
      if (field.visibleWhen && next[field.visibleWhen.field] !== field.visibleWhen.equals) delete next[field.id]
    }
  }
  return next
}
const copy = {
  en: {
    eyebrow: 'PHASES 4–5 · SCHEMA & FAMILY SAFEGUARDS',
    cycleUnavailable: 'DV-2027 form is not available yet',
    cycleDetails: 'The official instructions page currently lists DV-2026. The Department says it will announce the DV-2027 registration date later. This app has no DV-2027 fields and cannot accept DV answers.',
    status: 'DV-2027 config:', fields: 'fields published:', sample: 'SYNTHETIC SAMPLE · NOT A DV FORM',
    step: 'Step {current} of {total}', previous: 'Previous', next: 'Continue', finish: 'Continue to photo review preview',
    saved: 'Saved in this tab', description: 'This draft stays in this browser tab. Use fictional values only.',
    required: 'Required',
    addRecord: 'Add fictional record', removeRecord: 'Remove', record: 'Fictional record {number}', minRecords: 'Add at least one fictional record to continue.',
    duplicateRecord: 'These sample records use the same label. Choose a different label for each one.', incompleteRecord: 'Complete the required fields in each fictional record.',
    photoEyebrow: 'PHASE 6 · RULES GATE', photoTitle: 'Photo review foundation', photoStatus: 'PHOTO INTAKE DISABLED', photoBody: 'The DV-2027 photo specification has not been verified, so this preview does not accept, inspect, or upload any photo.', photoChecks: 'Once current instructions and secure storage are approved, the configured checks can cover file type, pixel dimensions, aspect ratio, and file size.', photoVisual: 'Optional on-device visual advisories and staff review must remain separate from any guarantee of acceptance. No face matching or biometric profile is created.', photoBack: 'Back to family example', photoDone: 'Continue to review preview', photoReview: 'Photo review is unavailable; continue with the fictional answer summary.',
    reviewEyebrow: 'PHASE 7 · SYNTHETIC REVIEW', reviewTitle: 'Review the example', reviewDescription: 'Check every sample answer and fictional record. Use Edit to return to a section. This is not a DV application.', edit: 'Edit', noAnswer: 'Not set', checked: 'Checked', unchecked: 'Not checked',
    demoAck: 'I reviewed only fictional demo data and understand this creates no real applicant approval, legal consent, government entry, or submission.', recordAck: 'Record demo acknowledgment', ackRecorded: 'Demo acknowledgment recorded in this page only at', printSummary: 'Print sample summary', finishReview: 'Finish preview',
  },
  am: {
    eyebrow: 'ደረጃ 4–5 · የቅጽ እቅድና የቤተሰብ ጥበቃዎች',
    cycleUnavailable: 'የDV-2027 ቅጽ ገና የለም',
    cycleDetails: 'ይፋዊው የመመሪያ ገጽ አሁን DV-2026ን ያሳያል። መምሪያው የDV-2027 ምዝገባ ቀንን በኋላ እንደሚያሳውቅ ገልጿል። ይህ መተግበሪያ የDV-2027 መስኮች የሉትም፤ የDV መልሶችንም አይቀበልም።',
    status: 'የDV-2027 ሁኔታ፦', fields: 'የታተሙ መስኮች፦', sample: 'ምናባዊ ምሳሌ · የDV ቅጽ አይደለም',
    step: 'ደረጃ {current} ከ {total}', previous: 'ቀዳሚ', next: 'ቀጥል', finish: 'ወደ የፎቶ ግምገማ ማሳያ ቀጥል',
    saved: 'በዚህ ታብ ብቻ ተቀምጧል', description: 'ይህ ረቂቅ በዚህ የአሳሽ ታብ ብቻ ይቆያል። ምናባዊ መረጃ ብቻ ይጠቀሙ።',
    required: 'ያስፈልጋል',
    addRecord: 'ምናባዊ መዝገብ ጨምር', removeRecord: 'አስወግድ', record: 'ምናባዊ መዝገብ {number}', minRecords: 'ለመቀጠል ቢያንስ አንድ ምናባዊ መዝገብ ያክሉ።',
    duplicateRecord: 'እነዚህ ምናባዊ መዝገቦች አንድ ዓይነት መለያ አላቸው። ለእያንዳንዱ የተለየ መለያ ይምረጡ።', incompleteRecord: 'በእያንዳንዱ ምናባዊ መዝገብ ውስጥ የሚያስፈልጉ መስኮችን ይሙሉ።',
    photoEyebrow: 'ደረጃ 6 · የመመሪያ ማረጋገጫ', photoTitle: 'የፎቶ ግምገማ መሠረት', photoStatus: 'የፎቶ ማስገባት ተዘግቷል', photoBody: 'የDV-2027 የፎቶ መስፈርት ስላልተረጋገጠ ይህ ቅድመ እይታ ፎቶ አይቀበልም፣ አይመረምርም ወይም አይጭንም።', photoChecks: 'የአሁኑ መመሪያና ደህንነቱ የተጠበቀ ማከማቻ ከተፈቀደ በኋላ፣ የተዋቀሩ ፍተሻዎች የፋይል አይነትን፣ ፒክስል መጠንን፣ ምጥጥንንና የፋይል መጠንን ሊያካትቱ ይችላሉ።', photoVisual: 'አማራጭ የመሣሪያው ላይ ምክርና የሰው ግምገማ ከመቀበል ዋስትና ተለይተው መቆየት አለባቸው። የፊት ማወዳደር ወይም የባዮሜትሪክ መገለጫ አይፈጠርም።', photoBack: 'ወደ ምናባዊ የቤተሰብ ምሳሌ ተመለስ', photoDone: 'ወደ ግምገማ ማሳያ ቀጥል', photoReview: 'የፎቶ ግምገማ አይገኝም፤ በምናባዊ መልሶች ማጠቃለያ ይቀጥሉ።',
    reviewEyebrow: 'ደረጃ 7 · ምናባዊ ግምገማ', reviewTitle: 'ምሳሌውን ይገምግሙ', reviewDescription: 'እያንዳንዱን ምናባዊ መልስና መዝገብ ይመልከቱ። ወደ ክፍሉ ለመመለስ “አርትዕ” ይጠቀሙ። ይህ የDV ማመልከቻ አይደለም።', edit: 'አርትዕ', noAnswer: 'አልተመረጠም', checked: 'ተመርጧል', unchecked: 'አልተመረጠም',
    demoAck: 'ምናባዊ የሙከራ መረጃን ብቻ እንደገመገምኩ እና ይህ ምንም እውነተኛ የአመልካች ማጽደቅ፣ ሕጋዊ ፈቃድ፣ የመንግሥት ግቤት ወይም ማስገባት እንደማይፈጥር ተረድቻለሁ።', recordAck: 'የምሳሌ ማረጋገጫ መዝግብ', ackRecorded: 'የምሳሌ ማረጋገጫ በዚህ ገጽ ብቻ በዚህ ሰዓት ተመዝግቧል፦', printSummary: 'የምሳሌ ማጠቃለያ አትም', finishReview: 'ቅድመ እይታውን ጨርስ',
  },
} satisfies Record<Language, Record<string, string>>

function SchemaField({ field, language, value, onChange, idPrefix = '' }: { field: Field; language: Language; value: unknown; onChange: (value: unknown) => void; idPrefix?: string }) {
  const label = `${field.label[language]}${field.required ? ' *' : ''}`
  const inputId = idPrefix ? `${idPrefix}-${field.id}` : field.id
  const common = { id: inputId, value: typeof value === 'string' ? value : '', onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(event.target.value) }
  return <label className="schema-field" htmlFor={inputId}>
    {field.type === 'boolean' ? <span className="schema-check"><input id={inputId} type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />{field.label[language]}{field.required ? ' *' : ''}</span> : <span>{label}</span>}
    {field.type === 'text' && <input {...common} type="text" maxLength={field.maxLength} required={field.required} />}
    {field.type === 'date' && <input {...common} type="date" required={field.required} />}
    {field.type === 'textarea' && <textarea {...common} maxLength={field.maxLength} required={field.required} rows={4} />}
    {field.type === 'select' && <select {...common} required={field.required}><option value="">—</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label[language]}</option>)}</select>}
    {field.help && <small>{field.help[language]}</small>}
  </label>
}

export function SchemaWizard({ language, onClose }: { language: Language; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(schemaDraftStorageKey) || '{}')
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? clearHiddenValues(saved as Record<string, unknown>) : {}
    } catch { return {} }
  })
  const [step, setStep] = useState(0)
  const [showPhotoGate, setShowPhotoGate] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [consentChecked, setConsentChecked] = useState(false)
  const [acknowledgedAt, setAcknowledgedAt] = useState('')
  const [message, setMessage] = useState('')
  const words = copy[language]
  const section = config.sections[step]
  const visibleFields = useMemo(() => section.fields.filter((field) => !field.visibleWhen || values[field.visibleWhen.field] === field.visibleWhen.equals), [section, values])

  useEffect(() => {
    try { sessionStorage.setItem(schemaDraftStorageKey, JSON.stringify(values)) } catch { /* The preview stays usable without session storage. */ }
  }, [values])

  function update(field: string, value: unknown) {
    setValues((current) => clearHiddenValues({ ...current, [field]: value }))
  }

  function rowsFor(group: RepeatableGroup): RecordRow[] {
    return Array.isArray(values[group.id]) ? values[group.id] as RecordRow[] : []
  }

  function addRecord(group: RepeatableGroup) {
    const rows = rowsFor(group)
    if (rows.length >= group.maxItems) return
    const recordId = crypto.randomUUID()
    update(group.id, [...rows, { recordId }])
  }

  function updateRecord(group: RepeatableGroup, recordId: string, fieldId: string, value: unknown) {
    update(group.id, rowsFor(group).map((row) => row.recordId === recordId ? { ...row, [fieldId]: value } : row))
  }

  function removeRecord(group: RepeatableGroup, recordId: string) {
    update(group.id, rowsFor(group).filter((row) => row.recordId !== recordId))
  }

  function advance() {
    const invalid = visibleFields.find((field) => field.required && (values[field.id] === undefined || values[field.id] === '' || values[field.id] === false))
    if (invalid) {
      setMessage(`${invalid.label[language]} — ${words.required}`)
      document.getElementById(invalid.id)?.focus()
      return
    }
    for (const group of section.repeatableGroups || []) {
      const rows = rowsFor(group)
      if (rows.length < group.minItems) { setMessage(words.minRecords); return }
      const uniqueValues = rows.map((row) => row[group.uniqueField]).filter((value): value is string => typeof value === 'string' && value !== '')
      if (new Set(uniqueValues).size !== uniqueValues.length) { setMessage(words.duplicateRecord); return }
      if (rows.some((row) => group.fields.some((field) => field.required && (row[field.id] === undefined || row[field.id] === '' || row[field.id] === false)))) {
        setMessage(words.incompleteRecord)
        return
      }
    }
    setMessage('')
    if (step < config.sections.length - 1) setStep((current) => current + 1)
    else setShowPhotoGate(true)
  }

  function displayValue(field: Field, value: unknown): string {
    if (field.type === 'boolean') return value === true ? words.checked : value === false ? words.unchecked : words.noAnswer
    if (typeof value !== 'string' || value === '') return words.noAnswer
    if (field.type === 'select') return field.options?.find((option) => option.value === value)?.label[language] || words.noAnswer
    return value
  }

  function editSection(index: number) {
    setConsentChecked(false)
    setAcknowledgedAt('')
    setShowReview(false)
    setShowPhotoGate(false)
    setStep(index)
  }

  if (showReview) return <section className="schema-workspace" aria-labelledby="phase7-title">
    <div className="workspace-heading"><div><p className="eyebrow">{words.reviewEyebrow}</p><h1 id="phase7-title">{words.reviewTitle}</h1></div><button className="secondary" type="button" onClick={onClose}>{language === 'en' ? '← Demo home' : '← ወደ ሙከራው መነሻ'}</button></div>
    <div className="cycle-blocked photo-gate" role="note"><span className="photo-gate-badge">{words.sample}</span><p>{words.reviewDescription}</p></div>
    <div className="schema-sample review-sample">
      {config.sections.map((reviewSection, index) => {
        const fields = reviewSection.fields.filter((field) => !field.visibleWhen || values[field.visibleWhen.field] === field.visibleWhen.equals)
        return <article className="review-section" key={reviewSection.id}>
          <div className="review-heading"><div><h2>{reviewSection.title[language]}</h2><p>{reviewSection.description[language]}</p></div><button className="secondary" type="button" onClick={() => editSection(index)}>{words.edit}</button></div>
          {fields.length > 0 && <dl className="review-values">{fields.map((field) => <div key={field.id}><dt>{field.label[language]}</dt><dd>{displayValue(field, values[field.id])}</dd></div>)}</dl>}
          {(reviewSection.repeatableGroups || []).map((group) => <div className="review-group" key={group.id}><h3>{group.title[language]}</h3>{rowsFor(group).length === 0 ? <p>{words.noAnswer}</p> : rowsFor(group).map((row, rowIndex) => <div className="review-record" key={row.recordId}><h4>{words.record.replace('{number}', String(rowIndex + 1))}</h4><dl className="review-values">{group.fields.map((field) => <div key={field.id}><dt>{field.label[language]}</dt><dd>{displayValue(field, row[field.id])}</dd></div>)}</dl></div>)}</div>)}
        </article>
      })}
      <div className="review-ack"><label className="schema-check"><input type="checkbox" checked={consentChecked} onChange={(event) => { setConsentChecked(event.target.checked); setAcknowledgedAt('') }} />{words.demoAck}</label>
        <div className="schema-actions"><button className="secondary" type="button" onClick={() => window.print()}>{words.printSummary}</button><button className="primary" type="button" disabled={!consentChecked} onClick={() => setAcknowledgedAt(new Date().toISOString())}>{words.recordAck}</button><button className="secondary" type="button" onClick={onClose}>{words.finishReview}</button></div>
        {acknowledgedAt && <p className="schema-help" role="status">{words.ackRecorded} {new Date(acknowledgedAt).toLocaleString(language === 'am' ? 'am-ET' : 'en-ET')}</p>}
      </div>
    </div>
  </section>

  if (showPhotoGate) return <section className="schema-workspace" aria-labelledby="phase6-title">
    <div className="workspace-heading"><div><p className="eyebrow">{words.photoEyebrow}</p><h1 id="phase6-title">{words.photoTitle}</h1></div><button className="secondary" type="button" onClick={onClose}>{language === 'en' ? '← Demo home' : '← ወደ ሙከራው መነሻ'}</button></div>
    <div className="cycle-blocked photo-gate" role="note"><span className="photo-gate-badge">{words.photoStatus}</span><p>{words.photoBody}</p></div>
    <div className="schema-sample photo-gate-content"><h2>{language === 'en' ? 'What Phase 6 will verify' : 'ደረጃ 6 የሚያረጋግጠው'}</h2><ul><li>{words.photoChecks}</li><li>{words.photoVisual}</li></ul><p className="schema-help">{words.description}</p><p className="schema-help">{words.photoReview}</p><div className="schema-actions"><button className="secondary" type="button" onClick={() => setShowPhotoGate(false)}>{words.photoBack}</button><button className="primary" type="button" onClick={() => setShowReview(true)}>{words.photoDone} →</button></div></div>
  </section>

  return <section className="schema-workspace" aria-labelledby="phase4-title">
    <div className="workspace-heading"><div><p className="eyebrow">{words.eyebrow}</p><h1 id="phase4-title">{config.title[language]}</h1></div><button className="secondary" type="button" onClick={onClose}>{language === 'en' ? '← Demo home' : '← ወደ ሙከራው መነሻ'}</button></div>
    <div className="cycle-blocked" role="note"><h2>{words.cycleUnavailable}</h2><p>{words.cycleDetails}</p><small>{words.status} {cycleConfig.status} · {words.fields} {cycleConfig.sections.length}</small></div>
    <div className="schema-sample"><span className="schema-tag">{words.sample}</span><h2>{config.title[language]}</h2><p>{config.description[language]}</p><div className="schema-progress"><span>{words.step.replace('{current}', String(step + 1)).replace('{total}', String(config.sections.length + 1))}</span><span>{words.saved}</span></div>
      <article className="schema-section"><h3>{section.title[language]}</h3><p>{section.description[language]}</p>{visibleFields.length > 0 && <div className="schema-fields">{visibleFields.map((field) => <SchemaField key={field.id} field={field} language={language} value={values[field.id]} onChange={(value) => update(field.id, value)} />)}</div>}
        {(section.repeatableGroups || []).map((group) => <div className="repeatable-group" key={group.id}><div className="repeatable-heading"><div><h4>{group.title[language]}</h4><p>{group.help[language]}</p></div><span>{rowsFor(group).length}/{group.maxItems}</span></div>
          {rowsFor(group).map((row, index) => <div className="repeatable-record" key={row.recordId}><div className="repeatable-record-heading"><strong>{words.record.replace('{number}', String(index + 1))}</strong><button className="text-button" type="button" onClick={() => removeRecord(group, row.recordId)}>{words.removeRecord}</button></div><div className="schema-fields">{group.fields.map((field) => <SchemaField key={field.id} idPrefix={row.recordId} field={field} language={language} value={row[field.id]} onChange={(value) => updateRecord(group, row.recordId, field.id, value)} />)}</div></div>)}
          <button className="secondary" type="button" disabled={rowsFor(group).length >= group.maxItems} onClick={() => addRecord(group)}>{words.addRecord} +</button>
        </div>)}
      </article>
      <p className="schema-help">{words.description}</p>{message && <p className="error" role="alert">{message}</p>}
      <div className="schema-actions">{step > 0 && <button className="secondary" type="button" onClick={() => { setMessage(''); setStep((current) => current - 1) }}>{words.previous}</button>}<button className="primary" type="button" onClick={advance}>{step < config.sections.length - 1 ? words.next : words.finish} →</button></div>
    </div>
  </section>
}
