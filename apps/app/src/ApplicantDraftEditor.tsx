import { useEffect, useState } from 'react'
import './ApplicantDraftEditor.css'

type Language = 'en' | 'am'
type Localized = Partial<Record<Language, string>> & { en: string }
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
type FormSchema = { cycle: string; status: string; schemaVersion: number; sections: Array<{ id: string; title: Localized; fields: Field[]; repeatableGroups?: RepeatableGroup[] }> }
type DraftBody = { schemaVersion: number; revision: number; answers: Record<string, unknown> }

const copy = {
  en: { open: 'Open saved draft', close: 'Close draft', loading: 'Loading reviewed form…', save: 'Save draft', saving: 'Saving…', saved: 'Draft saved to your secure case workspace.', empty: 'No reviewed form schema is available for this cycle yet. Answer collection is disabled.', local: 'Use this private workspace only after your cycle is approved. Draft answers are encrypted before database storage.', add: 'Add another', remove: 'Remove', required: 'Required', storage: 'Secure draft storage is not configured on this server.', error: 'Could not load this draft. Refresh and try again.', conflict: 'This draft changed in another session, or it uses an older form version. Editing is paused until the version change is reviewed.', review: 'Review answers', edit: 'Edit answers', reviewNote: 'This is a completeness aid for your own review. It is not official approval, legal consent, or confirmation that an entry is ready to submit.', missing: 'Required answers still to check', complete: 'No unanswered required fields were found by this basic check. Review every answer carefully; this does not confirm eligibility or official readiness.', unanswered: 'Not answered', noRows: 'Add at least one record', row: 'Record', yes: 'Yes', no: 'No' },
  am: { open: 'የተቀመጠ ረቂቅ ክፈት', close: 'ረቂቁን ዝጋ', loading: 'የተገመገመው ቅጽ እየጫነ ነው…', save: 'ረቂቁን አስቀምጥ', saving: 'በማስቀመጥ ላይ…', saved: 'ረቂቁ በደህንነቱ በተጠበቀ የጉዳይ ቦታ ተቀምጧል።', empty: 'ለዚህ ዑደት የተገመገመ ቅጽ ገና የለም። መልስ መሰብሰብ ተዘግቷል።', local: 'የዑደትዎ መመሪያ ከተፈቀደ በኋላ ብቻ ይህን የግል ቦታ ይጠቀሙ። ረቂቅ መልሶች ወደ ዳታቤዝ ከመቀመጣቸው በፊት ይመሰጠራሉ።', add: 'ሌላ ጨምር', remove: 'አስወግድ', required: 'ያስፈልጋል', storage: 'በዚህ አገልጋይ የደህንነት ረቂቅ ማከማቻ አልተዋቀረም።', error: 'ይህን ረቂቅ መጫን አልተቻለም። ያድሱና እንደገና ይሞክሩ።', conflict: 'ይህ ረቂቅ ተቀይሯል ወይም የቅጽ አሮጌ ስሪት ይጠቀማል። የስሪት ለውጡ እስኪገመገም አርትዖት ተቋርጧል።', review: 'መልሶችን ገምግም', edit: 'መልሶችን አርትዕ', reviewNote: 'ይህ ለራስዎ የሙሉነት ማረጋገጫ እገዛ ብቻ ነው። ይህ ይፋዊ ማረጋገጫ፣ ሕጋዊ ፈቃድ ወይም ማመልከቻው ለመላክ ዝግጁ መሆኑን የሚያሳይ አይደለም።', missing: 'እስካሁን ያልተመለሱ አስፈላጊ ጥያቄዎች', complete: 'በዚህ መሠረታዊ ምርመራ ያልተመለሰ አስፈላጊ መስክ አልተገኘም። ሁሉንም መልሶች በጥንቃቄ ይመልከቱ፤ ይህ ብቁነትን ወይም ይፋዊ ዝግጁነትን አያረጋግጥም።', unanswered: 'አልተመለሰም', noRows: 'ቢያንስ አንድ መዝገብ ያክሉ', row: 'መዝገብ', yes: 'አዎ', no: 'አይ' },
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (init.method && init.method !== 'GET') {
    const csrf = document.cookie.split('; ').find((part) => part.startsWith('dv_csrf='))?.slice('dv_csrf='.length)
    if (csrf) headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  }
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(['draft_revision_conflict', 'cycle_not_available', 'draft_storage_unavailable'].includes(body?.error?.code) ? body.error.code : body?.error?.message || `HTTP ${response.status}`)
  return body as T
}

function label(value: Localized, language: Language): string { return value[language] || value.en }
function blank(value: unknown): boolean { return typeof value !== 'string' || value.trim() === '' }

function clearHiddenAnswers(schema: FormSchema, answers: Record<string, unknown>): Record<string, unknown> {
  const next = { ...answers }
  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.visibleWhen && next[field.visibleWhen.field] !== field.visibleWhen.equals) delete next[field.id]
    }
  }
  return next
}

export function ApplicantDraftEditor({ caseID, cycleKey, language }: { caseID: string; cycleKey: string; language: Language }) {
  const t = copy[language]
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [schema, setSchema] = useState<FormSchema | null>(null)
  const [answers, setAnswers] = useState<Record<string, unknown>>({})
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [reviewing, setReviewing] = useState(false)

  useEffect(() => {
    if (!open) return
    let live = true
    Promise.all([
      request<{ schema: FormSchema }>(`/api/v1/cycles/${encodeURIComponent(cycleKey)}/form-schema`),
      request<DraftBody>(`/api/v1/cases/${caseID}/draft`),
    ]).then(([form, draft]) => {
      if (draft.schemaVersion !== form.schema.schemaVersion) throw new Error('draft_schema_version_conflict')
      if (live) { setSchema(form.schema); setAnswers(clearHiddenAnswers(form.schema, draft.answers || {})); setRevision(draft.revision || 0) }
    }).catch((cause: unknown) => { if (live) setError(cause instanceof Error ? cause.message : 'request_failed') })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [open, caseID, cycleKey])

  const update = (id: string, value: unknown) => { if (schema) setAnswers((current) => clearHiddenAnswers(schema, { ...current, [id]: value })); else setAnswers((current) => ({ ...current, [id]: value })); setMessage('') }
  const toggleDraft = () => {
    if (open) { setOpen(false); return }
    setLoading(true); setError(''); setMessage(''); setSchema(null); setAnswers({}); setOpen(true)
  }
  const updateRow = (group: RepeatableGroup, index: number, fieldID: string, value: unknown) => {
    const rows = Array.isArray(answers[group.id]) ? [...answers[group.id] as Array<Record<string, unknown>>] : []
    rows[index] = { ...(rows[index] || {}), [fieldID]: value }
    update(group.id, rows)
  }
  const save = async () => {
    setBusy(true); setError(''); setMessage('')
    try {
      const result = await request<{ revision: number }> (`/api/v1/cases/${caseID}/draft`, { method: 'PUT', body: JSON.stringify({ expectedRevision: revision, answers }) })
      setRevision(result.revision); setMessage(t.saved)
    } catch (cause) {
      setError(cause instanceof Error && cause.message === 'draft_revision_conflict' ? t.conflict : cause instanceof Error ? cause.message : t.error)
    } finally { setBusy(false) }
  }

  const missingRequired: Array<{ sectionID: string; sectionTitle: string; label: string }> = schema ? schema.sections.flatMap((section) => {
    const missing = section.fields.filter((field) => field.required && (!field.visibleWhen || answers[field.visibleWhen.field] === field.visibleWhen.equals) && (field.type === 'boolean' ? typeof answers[field.id] !== 'boolean' : blank(answers[field.id])))
      .map((field) => ({ sectionID: section.id, sectionTitle: label(section.title, language), label: label(field.label, language) }))
    const groups = (section.repeatableGroups || []).flatMap((group) => {
      const rows = Array.isArray(answers[group.id]) ? answers[group.id] as Array<Record<string, unknown>> : []
      if (rows.length < group.minItems) return [{ sectionID: section.id, sectionTitle: label(section.title, language), label: `${label(group.title, language)} — ${t.noRows}` }]
      return rows.flatMap((row, index) => group.fields.filter((field) => field.required && (!field.visibleWhen || row[field.visibleWhen.field] === field.visibleWhen.equals) && (field.type === 'boolean' ? typeof row[field.id] !== 'boolean' : blank(row[field.id]))).map((field) => ({ sectionID: section.id, sectionTitle: label(section.title, language), label: `${label(group.title, language)} · ${t.row} ${index + 1}: ${label(field.label, language)}` })))
    })
    return [...missing, ...groups]
  }) : []

  return <div className="applicant-draft">
    <button className="p3-button" type="button" onClick={toggleDraft}>{open ? t.close : t.open}</button>
    {open && <div className="draft-panel">
      <p className="draft-note">{t.local}</p>
      {loading && <p role="status">{t.loading}</p>}
      {error && <p className="p3-error" role="alert">{error === 'cycle_not_available' ? t.empty : error === 'draft_schema_version_conflict' || error === 'draft_revision_conflict' ? t.conflict : error === 'draft_storage_unavailable' ? t.storage : error}</p>}
      {!loading && !error && !schema && <p className="draft-note">{t.empty}</p>}
      {schema && <>
        <h4>{schema.cycle} · {language === 'am' ? 'የተገመገመ ቅጽ' : 'Reviewed form'} · v{schema.schemaVersion}</h4>
        {reviewing ? <div className="draft-review" aria-live="polite">
          <p className="draft-note">{t.reviewNote}</p>
          {missingRequired.length > 0 ? <><h5>{t.missing}</h5><ul>{missingRequired.map((item, index) => <li key={`${item.sectionID}-${item.label}-${index}`}><strong>{item.sectionTitle}:</strong> {item.label} — {t.unanswered}</li>)}</ul></> : <p className="draft-review-ok">{t.complete}</p>}
          {schema.sections.map((section) => <section className="draft-section" key={section.id}><h5>{label(section.title, language)}</h5>
            <dl className="draft-summary">{section.fields.filter((field) => !field.visibleWhen || answers[field.visibleWhen.field] === field.visibleWhen.equals).map((field) => {
              const value = answers[field.id]
              const shown = field.type === 'boolean' ? (typeof value === 'boolean' ? (value ? t.yes : t.no) : t.unanswered) : field.type === 'select' && typeof value === 'string' ? label(field.options?.find((option) => option.value === value)?.label || { en: value }, language) : (typeof value === 'string' && value.trim() ? value : t.unanswered)
              return <div key={field.id}><dt>{label(field.label, language)}</dt><dd>{shown}</dd></div>
            })}</dl>
            {(section.repeatableGroups || []).map((group) => { const rows = Array.isArray(answers[group.id]) ? answers[group.id] as Array<Record<string, unknown>> : []; return <div className="draft-review-group" key={group.id}><h6>{label(group.title, language)}</h6>{rows.length === 0 ? <p>{t.noRows}</p> : rows.map((row, index) => <dl className="draft-summary" key={`${group.id}-${index}`}><dt>{t.row} {index + 1}</dt>{group.fields.filter((field) => !field.visibleWhen || row[field.visibleWhen.field] === field.visibleWhen.equals).map((field) => <div key={field.id}><dt>{label(field.label, language)}</dt><dd>{typeof row[field.id] === 'string' && (row[field.id] as string).trim() ? row[field.id] as string : typeof row[field.id] === 'boolean' ? ((row[field.id] as boolean) ? t.yes : t.no) : t.unanswered}</dd></div>)}</dl>)}</div> })}
          </section>)}
          <button type="button" className="p3-secondary" onClick={() => setReviewing(false)}>{t.edit}</button>
        </div> : <>
        {schema.sections.map((section) => <section className="draft-section" key={section.id}><h5>{label(section.title, language)}</h5>
          <div className="draft-fields">{section.fields.filter((field) => !field.visibleWhen || answers[field.visibleWhen.field] === field.visibleWhen.equals).map((field) => <DraftField key={field.id} field={field} language={language} t={t} value={answers[field.id]} disabled={busy} onChange={(value) => update(field.id, value)} />)}</div>
          {(section.repeatableGroups || []).map((group) => {
            const rows = Array.isArray(answers[group.id]) ? answers[group.id] as Array<Record<string, unknown>> : []
            return <div className="draft-group" key={group.id}><div><h6>{label(group.title, language)}</h6><p>{label(group.help, language)}</p></div>
              {rows.map((row, index) => <div className="draft-row" key={`${group.id}-${index}`}><div className="draft-row-title"><strong>{index + 1}</strong><button type="button" className="p3-link" disabled={busy} onClick={() => update(group.id, rows.filter((_, itemIndex) => itemIndex !== index))}>{t.remove}</button></div><div className="draft-fields">{group.fields.map((field) => <DraftField key={field.id} field={field} language={language} t={t} value={row[field.id]} disabled={busy} onChange={(value) => updateRow(group, index, field.id, value)} />)}</div></div>)}
              <button type="button" className="p3-secondary" disabled={busy || rows.length >= group.maxItems} onClick={() => update(group.id, [...rows, {}])}>{t.add}</button>
            </div>
          })}
        </section>)}
        {message && <p className="p3-success" role="status">{message}</p>}
        <button type="button" className="p3-secondary" disabled={busy} onClick={() => setReviewing(true)}>{t.review}</button>
        <button type="button" className="p3-button" disabled={busy} onClick={() => void save()}>{busy ? t.saving : t.save}</button>
        </>}
      </>}
    </div>}
  </div>
}

function DraftField({ field, language, t, value, disabled, onChange }: { field: Field; language: Language; t: typeof copy.en; value: unknown; disabled: boolean; onChange: (value: unknown) => void }) {
  const title = label(field.label, language)
  const help = field.help && label(field.help, language)
  return <label className="draft-field">{field.type === 'boolean' ? <span><input type="checkbox" disabled={disabled} checked={value === true} onChange={(event) => onChange(event.target.checked)} /> {title}{field.required ? ` * (${t.required})` : ''}</span> : <span>{title}{field.required ? ' *' : ''}</span>}
    {field.type === 'text' && <input type="text" disabled={disabled} maxLength={field.maxLength} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />}
    {field.type === 'textarea' && <textarea disabled={disabled} rows={3} maxLength={field.maxLength} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />}
    {field.type === 'date' && <input type="date" disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)} />}
    {field.type === 'select' && <select disabled={disabled} value={typeof value === 'string' ? value : ''} onChange={(event) => onChange(event.target.value)}><option value="">—</option>{field.options?.map((option) => <option key={option.value} value={option.value}>{label(option.label, language)}</option>)}</select>}
    {help && <small>{help}</small>}
  </label>
}
