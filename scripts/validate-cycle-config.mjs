import { readFile } from 'node:fs/promises'

const base = new URL('../config/dv-cycles/', import.meta.url)
const schema = JSON.parse(await readFile(new URL('schema-v1.json', base), 'utf8'))
const dv2027 = JSON.parse(await readFile(new URL('dv-2027.json', base), 'utf8'))
const demo = JSON.parse(await readFile(new URL('schema-demo.json', base), 'utf8'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function validateLocalized(value, label) {
  assert(typeof value?.en === 'string' && value.en.trim(), `${label} needs English copy`)
  assert(typeof value?.am === 'string' && value.am.trim(), `${label} needs Amharic copy`)
}

function validateField(field, seenIds, context) {
  assert(typeof field.id === 'string' && /^[a-z][a-z0-9_-]*$/.test(field.id), `${context} has an invalid id`)
  assert(!seenIds.has(field.id), `field id ${field.id} is repeated in ${context}`)
  seenIds.add(field.id)
  assert(['text', 'textarea', 'date', 'select', 'boolean'].includes(field.type), `field ${field.id} has an unsupported type`)
  validateLocalized(field.label, `field ${field.id} label`)
  if (field.help) validateLocalized(field.help, `field ${field.id} help`)
  assert(typeof field.required === 'boolean', `field ${field.id} must declare required`)
  if (field.type === 'select') {
    assert(Array.isArray(field.options) && field.options.length > 0, `select ${field.id} needs options`)
    const values = new Set()
    for (const option of field.options) {
      assert(typeof option.value === 'string' && option.value.length > 0, `select ${field.id} has an empty option value`)
      assert(!values.has(option.value), `select ${field.id} repeats option ${option.value}`)
      values.add(option.value)
      validateLocalized(option.label, `option ${option.value} label`)
    }
  }
  if (field.type === 'text' || field.type === 'textarea') {
    assert(Number.isInteger(field.maxLength) && field.maxLength > 0 && field.maxLength <= 2000, `field ${field.id} needs a bounded maxLength`)
  }
  return field
}

assert(schema.$schema.includes('json-schema.org'), 'schema-v1.json must declare JSON Schema')
assert(dv2027.schemaVersion === 1 && dv2027.cycle === 'DV-2027', 'DV-2027 config has invalid version or cycle')
assert(dv2027.status === 'blocked_pending_official_instructions', 'DV-2027 must remain blocked until official rules are verified')
assert(Array.isArray(dv2027.sections) && dv2027.sections.length === 0, 'DV-2027 must not publish unverified fields')
assert(Array.isArray(dv2027.sources) && dv2027.sources.length >= 1, 'DV-2027 config must retain its official source references')
for (const source of dv2027.sources) {
  const url = new URL(source)
  assert(url.protocol === 'https:' && url.hostname === 'travel.state.gov', 'cycle sources must use the official State Department HTTPS site')
}
assert(demo.schemaVersion === 1 && Number.isInteger(demo.configVersion) && demo.configVersion >= 1, 'synthetic schema sample has invalid version')
assert(Array.isArray(demo.sections) && demo.sections.length > 0, 'synthetic sample must contain demonstration sections')

const ids = new Set()
const fieldById = new Map()
for (const section of demo.sections) {
  assert(typeof section.id === 'string' && /^[a-z][a-z0-9_-]*$/.test(section.id), 'each sample section needs a stable id')
  assert(!ids.has(section.id), `section id ${section.id} is repeated`)
  ids.add(section.id)
  validateLocalized(section.title, `section ${section.id} title`)
  validateLocalized(section.description, `section ${section.id} description`)
  assert(section.fields.length > 0 || (section.repeatableGroups?.length ?? 0) > 0, `section ${section.id} must contain a field or repeatable group`)
  for (const field of section.fields) {
    validateField(field, ids, `section ${section.id}`); fieldById.set(field.id, field)
  }
  for (const group of section.repeatableGroups ?? []) {
    assert(typeof group.id === 'string' && /^[a-z][a-z0-9_-]*$/.test(group.id), `group in ${section.id} needs a stable id`)
    validateLocalized(group.title, `group ${group.id} title`)
    validateLocalized(group.help, `group ${group.id} help`)
    assert(Number.isInteger(group.minItems) && group.minItems >= 0 && Number.isInteger(group.maxItems) && group.maxItems > 0 && group.maxItems <= 30 && group.minItems <= group.maxItems, `group ${group.id} has invalid bounds`)
    assert(Array.isArray(group.fields) && group.fields.length > 0, `group ${group.id} needs fields`)
    const groupFields = new Set()
    for (const field of group.fields) validateField(field, groupFields, `group ${group.id}`)
    assert(groupFields.has(group.uniqueField), `group ${group.id} uniqueField must refer to one of its fields`)
  }
}
for (const section of demo.sections) {
  for (const field of section.fields) {
    if (field.visibleWhen) assert(fieldById.has(field.visibleWhen.field), `condition source for ${field.id} does not exist`)
  }
}

console.log(`Validated schema-v1.json, DV-2027 (0 unverified fields), and ${demo.sections.length} synthetic sections.`)
