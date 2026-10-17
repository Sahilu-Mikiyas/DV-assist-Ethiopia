import { useEffect, useState, type FormEvent } from 'react'
import './Phase3Portal.css'

type Lang = 'en' | 'am'
type User = { id: string; email: string; roles: string[]; mfaEnabled: boolean; mfaVerified: boolean; mfaSetupRequired: boolean }
type CaseItem = { id: string; cycleKey: string; status: string; revision: number; createdAt: string; updatedAt: string; closedAt?: string }
type TimelineEvent = { type: string; previousStatus?: string; newStatus?: string; createdAt: string }
type StaffUser = { id: string; email: string; mfaEnabled: boolean }
type FoundUser = { id: string; email: string; mfaEnabled: boolean; disabled: boolean }

const words = {
  en: {
    title: 'Account & case workspace', subtitle: 'Phase 3 · development preview', warning: 'Development foundation only. Use a synthetic email and fictional cycle metadata. Do not enter DV answers, real applicant information, or payment details.', loading: 'Checking account session…', unavailable: 'The local API is unreachable or its database is not ready. Start PostgreSQL, apply the Phase 3 migration, start the Go API, then refresh.', email: 'Email address', requestCode: 'Send sign-in code', code: 'Email code', mfaCode: 'Authenticator code (staff/admin)', verify: 'Verify and sign in', signedOut: 'No active session.', requested: 'If this address can sign in, a code has been sent.', devCode: 'Local development code', codeSent: 'Code requested. Check your email or use the development-only code shown here.', signOut: 'Sign out', roles: 'Roles', mfaOn: 'Authenticator MFA is active', setupMfa: 'Set up staff MFA', mfaIntro: 'Add this secret to an authenticator app, then enter its current 6-digit code to activate staff access.', mfaSecret: 'Authenticator setup secret', activateMfa: 'Activate MFA', applicantCases: 'My cases', staffCases: 'Assigned staff cases', noCases: 'No cases yet.', cycleKey: 'Cycle key', createCase: 'Create preparation case', cycleWarning: 'Metadata only; this does not confirm a cycle or its official rules.', status: 'Status', revision: 'Revision', created: 'Created', timeline: 'View timeline', hideTimeline: 'Hide timeline', timelineEmpty: 'No events.', statusTo: 'Change status to', saveStatus: 'Update status', staffRoster: 'Staff accounts', assign: 'Assign', chooseStaff: 'Choose staff member', findAccount: 'Find verified account by exact email', lookup: 'Look up account', role: 'Role', grantStaff: 'Grant staff role', revokeStaff: 'Revoke staff role', grantAdmin: 'Grant admin role', revokeAdmin: 'Revoke admin role', resetMfa: 'Reset MFA and revoke sessions', mfaRequired: 'Enroll in authenticator MFA before using staff features.', error: 'The request could not be completed.', refresh: 'Refresh', noStaff: 'No active staff accounts.', roleApplicant: 'Applicant', roleStaff: 'Staff', roleAdmin: 'Administrator', inPreparation: 'In preparation', needsReview: 'Needs review', readyApplicant: 'Ready for applicant', closed: 'Closed', eventCaseCreated: 'Case created', eventCaseViewed: 'Case viewed', eventTimelineViewed: 'Timeline viewed', eventStatusChanged: 'Status changed', eventStaffAssigned: 'Staff assigned', statusGraph: 'Allowed flow: preparation → review → ready for applicant → closed. Staff changes are recorded.', signInNote: 'Email is the sign-in and recovery channel. Codes expire after 10 minutes.', lookupResult: 'Verified account', mfaMissing: 'MFA not yet enrolled', mfaReady: 'MFA enrolled',
  },
  am: {
    title: 'የመለያና የጉዳይ ቦታ', subtitle: 'ደረጃ 3 · የልማት ሙከራ', warning: 'የልማት መሠረት ብቻ ነው። ምናባዊ ኢሜይልና የዑደት መረጃ ይጠቀሙ። የDV መልሶች፣ እውነተኛ የአመልካች መረጃ ወይም የክፍያ ዝርዝር አያስገቡ።', loading: 'የመለያ ግንኙነት እየተፈተሸ ነው…', unavailable: 'የአካባቢ API አይደረስም ወይም ዳታቤዙ ዝግጁ አይደለም። PostgreSQL ያስነሱ፣ የPhase 3 ማይግሬሽን ይተግብሩ፣ Go API ያስነሱ፣ ከዚያ ያድሱ።', email: 'ኢሜይል አድራሻ', requestCode: 'የመግቢያ ኮድ ላክ', code: 'የኢሜይል ኮድ', mfaCode: 'የAuthenticator ኮድ (ሰራተኛ/አስተዳዳሪ)', verify: 'አረጋግጥና ግባ', signedOut: 'ንቁ የመለያ ግንኙነት የለም።', requested: 'ይህ አድራሻ መግባት ከቻለ ኮድ ተልኳል።', devCode: 'የአካባቢ ልማት ኮድ', codeSent: 'ኮድ ተጠይቋል። ኢሜይልዎን ይመልከቱ ወይም ከታች ያለውን ለልማት ብቻ ኮድ ይጠቀሙ።', signOut: 'ውጣ', roles: 'ሚናዎች', mfaOn: 'Authenticator MFA ንቁ ነው', setupMfa: 'የሰራተኛ MFA አዘጋጅ', mfaIntro: 'ይህን ሚስጥር በAuthenticator መተግበሪያ ያስገቡ፣ ከዚያ የአሁኑን 6 አሃዝ ኮድ በማስገባት ያንቁ።', mfaSecret: 'የAuthenticator ማዋቀሪያ ሚስጥር', activateMfa: 'MFA አንቃ', applicantCases: 'የእኔ ጉዳዮች', staffCases: 'ለእኔ የተመደቡ ጉዳዮች', noCases: 'ገና ጉዳይ የለም።', cycleKey: 'የዑደት ቁልፍ', createCase: 'የዝግጅት ጉዳይ ፍጠር', cycleWarning: 'የመለያ መረጃ ብቻ ነው፤ የዑደቱን ይፋዊ መመሪያ አያረጋግጥም።', status: 'ሁኔታ', revision: 'ስሪት', created: 'የተፈጠረበት', timeline: 'የጊዜ ሰሌዳውን አሳይ', hideTimeline: 'የጊዜ ሰሌዳውን ደብቅ', timelineEmpty: 'ክስተት የለም።', statusTo: 'ሁኔታን ወደ', saveStatus: 'ሁኔታን አዘምን', staffRoster: 'የሰራተኛ መለያዎች', assign: 'መድብ', chooseStaff: 'ሰራተኛ ይምረጡ', findAccount: 'በትክክለኛው ኢሜይል የተረጋገጠ መለያ ፈልግ', lookup: 'መለያውን ፈልግ', role: 'ሚና', grantStaff: 'የሰራተኛ ሚና ስጥ', revokeStaff: 'የሰራተኛ ሚና አንሳ', grantAdmin: 'የአስተዳዳሪ ሚና ስጥ', revokeAdmin: 'የአስተዳዳሪ ሚና አንሳ', resetMfa: 'MFA አስጀምርና ግንኙነቶችን ዝጋ', mfaRequired: 'የሰራተኛ ባህሪያትን ከመጠቀም በፊት Authenticator MFA ያዘጋጁ።', error: 'ጥያቄው ማስፈጸም አልተቻለም።', refresh: 'አድስ', noStaff: 'ንቁ የሰራተኛ መለያ የለም።', roleApplicant: 'አመልካች', roleStaff: 'ሰራተኛ', roleAdmin: 'አስተዳዳሪ', inPreparation: 'በዝግጅት ላይ', needsReview: 'ግምገማ ያስፈልጋል', readyApplicant: 'ለአመልካች ዝግጁ', closed: 'ተዘግቷል', eventCaseCreated: 'ጉዳይ ተፈጥሯል', eventCaseViewed: 'ጉዳይ ታይቷል', eventTimelineViewed: 'የጊዜ ሰሌዳ ታይቷል', eventStatusChanged: 'ሁኔታ ተቀይሯል', eventStaffAssigned: 'ሰራተኛ ተመድቧል', statusGraph: 'የተፈቀደው ሂደት፦ ዝግጅት → ግምገማ → ለአመልካች ዝግጁ → ተዘጋ። የሰራተኛ ለውጦች ይመዘገባሉ።', signInNote: 'ኢሜይል ለመግባትና ለመለያ መመለስ ይጠቅማል። ኮዶች ከ10 ደቂቃ በኋላ ያበቃሉ።', lookupResult: 'የተረጋገጠ መለያ', mfaMissing: 'MFA ገና አልተዘጋጀም', mfaReady: 'MFA ተዘጋጅቷል',
  },
} satisfies Record<Lang, Record<string, string>>

async function apiCall<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  const csrf = document.cookie.split('; ').find((part) => part.startsWith('dv_csrf='))?.slice('dv_csrf='.length)
  if (csrf && init.method && init.method !== 'GET') headers.set('X-CSRF-Token', decodeURIComponent(csrf))
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin', cache: 'no-store' })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.message || `HTTP ${response.status}`)
  return body as T
}

function statusLabel(status: string, t: typeof words.en): string {
  const labels: Record<string, string> = { in_preparation: t.inPreparation, needs_review: t.needsReview, ready_for_applicant: t.readyApplicant, closed: t.closed }
  return labels[status] || status
}

export function Phase3Portal({ lang }: { lang: Lang }) {
  const t = words[lang]
  const [phase, setPhase] = useState<'loading' | 'unavailable' | 'signed-out' | 'signed-in'>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [email, setEmail] = useState('demo@example.invalid')
  const [code, setCode] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [codeRequested, setCodeRequested] = useState(false)
  const [developmentCode, setDevelopmentCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [cycleKey, setCycleKey] = useState('DV-2027')
  const [myCases, setMyCases] = useState<CaseItem[]>([])
  const [staffCases, setStaffCases] = useState<CaseItem[]>([])
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([])
  const [timeline, setTimeline] = useState<Record<string, TimelineEvent[]>>({})
  const [expanded, setExpanded] = useState<string>('')
  const [nextStatus, setNextStatus] = useState<Record<string, string>>({})
  const [assignment, setAssignment] = useState<Record<string, string>>({})
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; otpauthUri: string } | null>(null)
  const [activationCode, setActivationCode] = useState('')
  const [lookupEmail, setLookupEmail] = useState('')
  const [foundUser, setFoundUser] = useState<{ user: FoundUser; roles: string[] } | null>(null)

  useEffect(() => {
    let live = true
    apiCall<{ user: User }>('/api/v1/session').then(({ user: current }) => {
      if (live) { setUser(current); setPhase('signed-in') }
    }).catch((cause: unknown) => {
      if (!live) return
      if (cause instanceof Error && cause.message.includes('not configured')) setPhase('unavailable')
      else if (cause instanceof Error && cause.message === 'Sign in to continue.') setPhase('signed-out')
      else setPhase('unavailable')
    })
    return () => { live = false }
  }, [refresh])

  useEffect(() => {
    if (phase !== 'signed-in' || !user) return
    let live = true
    const load = async () => {
      try {
        const applicant = await apiCall<{ items: CaseItem[] }>('/api/v1/cases')
        if (live) setMyCases(applicant.items)
      } catch { if (live) setError(t.error) }
      if ((user.roles.includes('staff') || user.roles.includes('administrator')) && user.mfaVerified) {
        try {
          const staff = await apiCall<{ items: CaseItem[] }>('/api/v1/staff/cases')
          if (live) setStaffCases(staff.items)
        } catch { if (live) setError(t.error) }
      }
      if (user.roles.includes('administrator') && user.mfaVerified) {
        try {
          const staff = await apiCall<{ items: StaffUser[] }>('/api/v1/admin/staff')
          if (live) setStaffUsers(staff.items)
        } catch { if (live) setError(t.error) }
      }
    }
    void load()
    return () => { live = false }
  }, [phase, user, refresh, t.error])

  const handleRequestCode = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setDevelopmentCode('')
    try {
      const body = await apiCall<{ developmentCode?: string }>('/api/v1/auth/challenges', { method: 'POST', body: JSON.stringify({ email }) })
      setCodeRequested(true)
      if (body.developmentCode) { setDevelopmentCode(body.developmentCode); setCode(body.developmentCode) }
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const body = await apiCall<{ user: User }>('/api/v1/auth/verify', { method: 'POST', body: JSON.stringify({ email, code, mfaCode }) })
      setUser(body.user); setPhase('signed-in'); setCode(''); setMfaCode(''); setCodeRequested(false); setRefresh((value) => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const logout = async () => {
    setBusy(true); setError('')
    try { await apiCall('/api/v1/logout', { method: 'POST' }); setUser(null); setMyCases([]); setStaffCases([]); setPhase('signed-out') }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const createCase = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await apiCall('/api/v1/cases', { method: 'POST', body: JSON.stringify({ cycleKey }) }); setRefresh((value) => value + 1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const setupMFA = async () => {
    setBusy(true); setError('')
    try { const body = await apiCall<{ secret: string; otpauthUri: string }>('/api/v1/auth/mfa/setup', { method: 'POST' }); setMfaSetup(body) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const activateMFA = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try { await apiCall('/api/v1/auth/mfa/activate', { method: 'POST', body: JSON.stringify({ code: activationCode }) }); setMfaSetup(null); setActivationCode(''); setRefresh((value) => value + 1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const loadTimeline = async (caseID: string) => {
    if (expanded === caseID) { setExpanded(''); return }
    setBusy(true); setError('')
    try { const body = await apiCall<{ items: TimelineEvent[] }>(`/api/v1/cases/${caseID}/events`); setTimeline((items) => ({ ...items, [caseID]: body.items })); setExpanded(caseID) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const transition = async (item: CaseItem) => {
    setBusy(true); setError('')
    try { await apiCall(`/api/v1/staff/cases/${item.id}/transition`, { method: 'POST', body: JSON.stringify({ status: nextStatus[item.id], expectedRevision: item.revision }) }); setRefresh((value) => value + 1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const assign = async (item: CaseItem) => {
    setBusy(true); setError('')
    try { await apiCall(`/api/v1/staff/cases/${item.id}/assignment`, { method: 'POST', body: JSON.stringify({ staffUserId: assignment[item.id], expectedRevision: item.revision }) }); setRefresh((value) => value + 1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const findUser = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setFoundUser(null)
    try { const body = await apiCall<{ user: FoundUser; roles: string[] }>('/api/v1/admin/users/lookup', { method: 'POST', body: JSON.stringify({ email: lookupEmail }) }); setFoundUser(body) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const changeRole = async (role: 'staff' | 'administrator', action: 'grant' | 'revoke') => {
    if (!foundUser) return
    setBusy(true); setError('')
    try {
      await apiCall(`/api/v1/admin/users/${foundUser.user.id}/roles`, { method: 'POST', body: JSON.stringify({ role, action }) })
      const body = await apiCall<{ user: FoundUser; roles: string[] }>('/api/v1/admin/users/lookup', { method: 'POST', body: JSON.stringify({ email: lookupEmail }) }); setFoundUser(body); setRefresh((value) => value + 1)
    } catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const resetMFA = async (targetID: string) => {
    setBusy(true); setError('')
    try { await apiCall(`/api/v1/admin/users/${targetID}/mfa-reset`, { method: 'POST' }); setRefresh((value) => value + 1) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.error) }
    finally { setBusy(false) }
  }

  const roleName = (role: string) => role === 'applicant' ? t.roleApplicant : role === 'staff' ? t.roleStaff : t.roleAdmin
  const renderCase = (item: CaseItem, staffView: boolean) => <article className="p3-case" key={`${staffView ? 'staff' : 'mine'}-${item.id}`}>
    <div className="p3-case-heading"><div><strong>{item.cycleKey}</strong><small>{item.id}</small></div><span className={`p3-status ${item.status}`}>{statusLabel(item.status, t)}</span></div>
    <div className="p3-case-meta"><span>{t.revision}: {item.revision}</span><span>{t.created}: {new Date(item.createdAt).toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-ET')}</span></div>
    {staffView && <div className="p3-case-workflow"><label>{t.statusTo}<select value={nextStatus[item.id] || item.status} onChange={(event) => setNextStatus((current) => ({ ...current, [item.id]: event.target.value }))}><option value="in_preparation">{t.inPreparation}</option><option value="needs_review">{t.needsReview}</option><option value="ready_for_applicant">{t.readyApplicant}</option><option value="closed">{t.closed}</option></select></label><button className="p3-button" disabled={busy || !nextStatus[item.id] || nextStatus[item.id] === item.status} onClick={() => void transition(item)}>{t.saveStatus}</button></div>}
    {user?.roles.includes('administrator') && staffView && item.status !== 'closed' && <div className="p3-case-workflow"><label>{t.assign}<select value={assignment[item.id] || ''} onChange={(event) => setAssignment((current) => ({ ...current, [item.id]: event.target.value }))}><option value="">{t.chooseStaff}</option>{staffUsers.filter((member) => member.mfaEnabled).map((member) => <option value={member.id} key={member.id}>{member.email}</option>)}</select></label><button className="p3-button" disabled={busy || !assignment[item.id]} onClick={() => void assign(item)}>{t.assign}</button></div>}
    <button className="p3-link" onClick={() => void loadTimeline(item.id)}>{expanded === item.id ? t.hideTimeline : t.timeline}</button>
    {expanded === item.id && <ol className="p3-timeline">{(timeline[item.id] || []).length === 0 && <li>{t.timelineEmpty}</li>}{(timeline[item.id] || []).map((event, index) => <li key={`${event.createdAt}-${index}`}><span>{eventLabel(event.type, event.newStatus, t)}</span><time>{new Date(event.createdAt).toLocaleString(lang === 'am' ? 'am-ET' : 'en-ET')}</time></li>)}</ol>}
  </article>

  return <section className="p3-portal" aria-labelledby="p3-title">
    <div className="p3-heading"><div><p className="eyebrow">{t.subtitle}</p><h2 id="p3-title">{t.title}</h2></div><button className="p3-link" onClick={() => setRefresh((value) => value + 1)}>{t.refresh}</button></div>
    <p className="p3-warning">{t.warning}</p>
    {error && <p className="p3-error" role="alert">{error}</p>}
    {phase === 'loading' && <p className="p3-muted" role="status">{t.loading}</p>}
    {phase === 'unavailable' && <p className="p3-muted">{t.unavailable}</p>}
    {phase === 'signed-out' && <div className="p3-signin">
      <p className="p3-muted">{t.signInNote}</p>
      <form onSubmit={handleRequestCode} className="p3-form"><label>{t.email}<input type="email" required autoComplete="email" maxLength={320} value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="p3-button" disabled={busy}>{t.requestCode}</button></form>
      {codeRequested && <form onSubmit={handleVerify} className="p3-form p3-verify"><p role="status">{t.codeSent}</p>{developmentCode && <label>{t.devCode}<input value={developmentCode} readOnly /></label>}<label>{t.code}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value)} /></label><label>{t.mfaCode}<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} /></label><button className="p3-button" disabled={busy}>{t.verify}</button></form>}
    </div>}
    {phase === 'signed-in' && user && <>
      <div className="p3-account"><div><strong>{user.email}</strong><div className="p3-roles">{user.roles.map((role) => <span key={role}>{roleName(role)}</span>)}</div></div><button className="p3-secondary" disabled={busy} onClick={() => void logout()}>{t.signOut}</button></div>
      {user.mfaSetupRequired && <div className="p3-mfa"><strong>{t.mfaRequired}</strong>{!mfaSetup ? <button className="p3-button" onClick={() => void setupMFA()} disabled={busy}>{t.setupMfa}</button> : <><p>{t.mfaIntro}</p><label>{t.mfaSecret}<input readOnly value={mfaSetup.secret} /></label><a href={mfaSetup.otpauthUri}>Open authenticator link</a><form className="p3-form" onSubmit={(event) => void activateMFA(event)}><label>{t.mfaCode}<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={activationCode} onChange={(event) => setActivationCode(event.target.value)} required /></label><button className="p3-button" disabled={busy}>{t.activateMfa}</button></form></>}</div>}
      {user.mfaEnabled && user.mfaVerified && (user.roles.includes('staff') || user.roles.includes('administrator')) && <p className="p3-success">{t.mfaOn}</p>}
      {user.roles.includes('applicant') && <section className="p3-section"><div className="p3-section-heading"><h3>{t.applicantCases}</h3><button className="p3-link" onClick={() => setRefresh((value) => value + 1)}>{t.refresh}</button></div><form className="p3-create" onSubmit={(event) => void createCase(event)}><label>{t.cycleKey}<input value={cycleKey} maxLength={32} pattern="[A-Za-z0-9._-]{1,32}" onChange={(event) => setCycleKey(event.target.value)} required /></label><button className="p3-button" disabled={busy}>{t.createCase}</button><small>{t.cycleWarning}</small></form><div className="p3-case-list">{myCases.length ? myCases.map((item) => renderCase(item, false)) : <p className="p3-muted">{t.noCases}</p>}</div></section>}
      {user.mfaSetupRequired && <p className="p3-muted">{t.mfaRequired}</p>}
      {(user.roles.includes('staff') || user.roles.includes('administrator')) && user.mfaVerified && <section className="p3-section"><h3>{t.staffCases}</h3><p className="p3-muted">{t.statusGraph}</p><div className="p3-case-list">{staffCases.length ? staffCases.map((item) => renderCase(item, true)) : <p className="p3-muted">{t.noCases}</p>}</div></section>}
      {user.roles.includes('administrator') && user.mfaVerified && <section className="p3-section"><h3>{t.staffRoster}</h3>{staffUsers.length ? staffUsers.map((member) => <div className="p3-staff-row" key={member.id}><span>{member.email}<small>{member.mfaEnabled ? t.mfaReady : t.mfaMissing}</small></span>{member.id !== user.id && <button className="p3-secondary" disabled={busy} onClick={() => void resetMFA(member.id)}>{t.resetMfa}</button>}</div>) : <p className="p3-muted">{t.noStaff}</p>}
        <form className="p3-form p3-role-search" onSubmit={(event) => void findUser(event)}><label>{t.findAccount}<input type="email" required maxLength={320} value={lookupEmail} onChange={(event) => setLookupEmail(event.target.value)} /></label><button className="p3-button" disabled={busy}>{t.lookup}</button></form>
        {foundUser && <div className="p3-found"><strong>{t.lookupResult}: {foundUser.user.email}</strong><span>{t.roles}: {foundUser.roles.map(roleName).join(', ') || '—'}</span><div><button className="p3-secondary" onClick={() => void changeRole('staff', foundUser.roles.includes('staff') ? 'revoke' : 'grant')} disabled={busy}>{foundUser.roles.includes('staff') ? t.revokeStaff : t.grantStaff}</button><button className="p3-secondary" onClick={() => void changeRole('administrator', foundUser.roles.includes('administrator') ? 'revoke' : 'grant')} disabled={busy}>{foundUser.roles.includes('administrator') ? t.revokeAdmin : t.grantAdmin}</button></div></div>}
      </section>}
    </>}
  </section>
}

function eventLabel(type: string, status: string | undefined, t: typeof words.en): string {
  const labels: Record<string, string> = { case_created: t.eventCaseCreated, case_viewed: t.eventCaseViewed, timeline_viewed: t.eventTimelineViewed, status_changed: t.eventStatusChanged, staff_assigned: t.eventStaffAssigned }
  return `${labels[type] || type}${status ? ` · ${statusLabel(status, t)}` : ''}`
}
