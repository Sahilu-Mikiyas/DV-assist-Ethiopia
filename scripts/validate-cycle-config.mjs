import { readFile } from 'node:fs/promises'

const base = new URL('../config/dv-cycles/', import.meta.url)
const schema = JSON.parse(await readFile(new URL('schema-v1.json', base), 'utf8'))
const dv2027 = JSON.parse(await readFile(new URL('dv-2027.json', base), 'utf8'))
const demo = JSON.parse(await readFile(new URL('schema-demo.json', base), 'utf8'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertOnlyKeys(value, allowed, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`)
  const unexpected = Object.keys(value).filter((key) => !allowed.includes(key))
  assert(unexpected.length === 0, `${label} has unsupported keys: ${unexpected.join(', ')}`)
}

function validateLocalized(value, label) {
  assertOnlyKeys(value, ['en', 'am'], label)
  assert(typeof value.en === 'string' && value.en.trim(), `${label} needs English copy`)
  assert(typeof value.am === 'string' && value.am.trim(), `${label} needs Amharic copy`)
}

function validateField(field, usedIds, label, conditionalFields, { allowCondition = true } = {}) {
  assertOnlyKeys(field, ['id', 'type', 'label', 'help', 'required', 'maxLength', 'options', 'visibleWhen'], label)
  assert(typeof field.id === 'string' && /^[a-z][a-z0-9_-]*$/.test(field.id), `${label} has an invalid id`)
  assert(!usedIds.has(field.id), `id ${field.id} is repeated`)
  usedIds.add(field.id)
  assert(['text', 'textarea', 'date', 'select', 'boolean'].includes(field.type), `field ${field.id} has an unsupported type`)
  validateLocalized(field.label, `field ${field.id} label`)
  if (field.help !== undefined) validateLocalized(field.help, `field ${field.id} help`)
  assert(typeof field.required === 'boolean', `field ${field.id} must declare required`)

  if (field.type === 'select') {
    assert(Array.isArray(field.options) && field.options.length > 0, `select ${field.id} needs options`)
    const values = new Set()
    for (const option of field.options) {
      assertOnlyKeys(option, ['value', 'label'], `option in ${field.id}`)
      assert(typeof option.value === 'string' && option.value.trim(), `select ${field.id} has an empty option value`)
      assert(!values.has(option.value), `select ${field.id} repeats option ${option.value}`)
      values.add(option.value)
      validateLocalized(option.label, `option ${option.value} label`)
    }
  } else {
    assert(field.options === undefined, `non-select field ${field.id} must not declare options`)
  }

  if (field.type === 'text' || field.type === 'textarea') {
    assert(Number.isInteger(field.maxLength) && field.maxLength > 0 && field.maxLength <= 2000, `field ${field.id} needs a bounded maxLength`)
  } else {
    assert(field.maxLength === undefined, `field ${field.id} must not declare maxLength`)
  }

  if (field.visibleWhen !== undefined) {
    assert(allowCondition, `field ${field.id} cannot use a condition in this context`)
    assertOnlyKeys(field.visibleWhen, ['field', 'equals'], `condition for ${field.id}`)
    assert(typeof field.visibleWhen.field === 'string' && field.visibleWhen.field.length > 0, `condition for ${field.id} needs a source field`)
    assert(typeof field.visibleWhen.equals === 'string' || typeof field.visibleWhen.equals === 'boolean', `condition for ${field.id} must compare a string or boolean value`)
    conditionalFields.push({ field, label })
  }

  return field
}

assert(schema.$schema?.includes('json-schema.org'), 'schema-v1.json must declare JSON Schema')
assert(dv2027.schemaVersion === 1 && dv2027.cycle === 'DV-2027', 'DV-2027 config has invalid version or cycle')
assert(dv2027.status === 'blocked_pending_official_instructions', 'DV-2027 must remain blocked until official rules are verified')
assert(Array.isArray(dv2027.sections) && dv2027.sections.length === 0, 'DV-2027 must not publish unverified fields')
assert(Array.isArray(dv2027.sources) && dv2027.sources.length >= 1, 'DV-2027 config must retain its official source references')
for (const source of dv2027.sources) {
  const url = new URL(source)
  assert(url.protocol === 'https:' && url.hostname === 'travel.state.gov', 'cycle sources must use the official State Department HTTPS site')
}

assertOnlyKeys(demo, ['schemaVersion', 'configVersion', 'title', 'description', 'sections'], 'synthetic schema sample')
assert(demo.schemaVersion === 1 && Number.isInteger(demo.configVersion) && demo.configVersion >= 1, 'synthetic schema sample has invalid version')
assert(Array.isArray(demo.sections) && demo.sections.length > 0, 'synthetic sample must contain demonstration sections')
validateLocalized(demo.title, 'synthetic schema title')
validateLocalized(demo.description, 'synthetic schema description')

const usedIds = new Set()
const fieldById = new Map()
const conditionalFields = []
for (const section of demo.sections) {
  assertOnlyKeys(section, ['id', 'title', 'description', 'fields', 'repeatableGroups'], 'section')
  assert(typeof section.id === 'string' && /^[a-z][a-z0-9_-]*$/.test(section.id), 'each sample section needs a stable id')
  assert(!usedIds.has(section.id), `id ${section.id} is repeated`)
  usedIds.add(section.id)
  validateLocalized(section.title, `section ${section.id} title`)
  validateLocalized(section.description, `section ${section.id} description`)
  assert(Array.isArray(section.fields), `section ${section.id} fields must be an array`)
  assert(Array.isArray(section.repeatableGroups ?? []), `section ${section.id} repeatableGroups must be an array`)
  assert(section.fields.length > 0 || (section.repeatableGroups?.length ?? 0) > 0, `section ${section.id} must contain a field or repeatable group`)

  for (const field of section.fields) {
    validateField(field, usedIds, `section ${section.id}`, conditionalFields)
    fieldById.set(field.id, field)
  }

  for (const group of section.repeatableGroups ?? []) {
    assertOnlyKeys(group, ['id', 'title', 'help', 'minItems', 'maxItems', 'uniqueField', 'fields'], `group in ${section.id}`)
    assert(typeof group.id === 'string' && /^[a-z][a-z0-9_-]*$/.test(group.id), `group in ${section.id} needs a stable id`)
    assert(!usedIds.has(group.id), `id ${group.id} is repeated`)
    usedIds.add(group.id)
    validateLocalized(group.title, `group ${group.id} title`)
    validateLocalized(group.help, `group ${group.id} help`)
    assert(Number.isInteger(group.minItems) && group.minItems >= 0 && Number.isInteger(group.maxItems) && group.maxItems > 0 && group.maxItems <= 30 && group.minItems <= group.maxItems, `group ${group.id} has invalid bounds`)
    assert(Array.isArray(group.fields) && group.fields.length > 0, `group ${group.id} needs fields`)
    const groupFieldIds = new Set()
    for (const field of group.fields) {
      validateField(field, usedIds, `group ${group.id}`, conditionalFields, { allowCondition: false })
      groupFieldIds.add(field.id)
    }
    assert(groupFieldIds.has(group.uniqueField), `group ${group.id} uniqueField must refer to one of its fields`)
  }
}

for (const { field } of conditionalFields) {
  const source = fieldById.get(field.visibleWhen.field)
  assert(source, `condition source for ${field.id} must be a top-level field that exists`)
  assert(source.visibleWhen === undefined, `condition source ${source.id} must always be visible`)
  if (source.type === 'boolean') {
    assert(typeof field.visibleWhen.equals === 'boolean', `condition for ${field.id} must compare a boolean source to a boolean value`)
  } else if (source.type === 'select') {
    assert(typeof field.visibleWhen.equals === 'string' && source.options.some((option) => option.value === field.visibleWhen.equals), `condition for ${field.id} must use an option value from ${source.id}`)
  } else {
    assert(['text', 'textarea', 'date'].includes(source.type) && typeof field.visibleWhen.equals === 'string', `condition for ${field.id} must compare a string source to a string value`)
  }
}

console.log(`Validated schema-v1.json, DV-2027 (0 unverified fields), and ${demo.sections.length} synthetic sections.`)
