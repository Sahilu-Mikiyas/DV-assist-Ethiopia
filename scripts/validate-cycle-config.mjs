import { readFile } from 'node:fs/promises'

const base = new URL('../config/dv-cycles/', import.meta.url)
const schema = JSON.parse(await readFile(new URL('schema-v1.json', base), 'utf8'))
const dv2027 = JSON.parse(await readFile(new URL('dv-2027.json', base), 'utf8'))
const demo = JSON.parse(await readFile(new URL('schema-demo.json', base), 'utf8'))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

assert(schema.$schema.includes('json-schema.org'), 'schema-v1.json must declare JSON Schema')
assert(dv2027.schemaVersion === 1 && dv2027.cycle === 'DV-2027', 'DV-2027 config has invalid version or cycle')
assert(dv2027.status === 'blocked_pending_official_instructions', 'DV-2027 must remain blocked until official rules are verified')
assert(Array.isArray(dv2027.sections) && dv2027.sections.length === 0, 'DV-2027 must not publish unverified fields')
assert(demo.schemaVersion === 1 && Number.isInteger(demo.configVersion) && demo.configVersion >= 1, 'synthetic schema sample has invalid version')
assert(demo.sections.length > 0, 'synthetic sample must contain demonstration sections')

const fieldTypes = new Set(['text', 'textarea', 'date', 'select', 'boolean'])
for (const section of demo.sections) {
  assert(section.id && section.title?.en && section.title?.am, 'each sample section needs a stable id and bilingual title')
  assert(section.fields.length > 0 || (section.repeatableGroups?.length ?? 0) > 0, `section ${section.id} must contain a field or repeatable group`)
  for (const field of section.fields) {
    assert(field.id && field.label?.en && field.label?.am, 'each sample field needs a stable id and bilingual label')
    assert(fieldTypes.has(field.type) && typeof field.required === 'boolean', `field ${field.id} has an unsupported type or missing required flag`)
    if (field.type === 'select') assert(Array.isArray(field.options) && field.options.length > 0, `select ${field.id} needs options`)
    if (field.visibleWhen) assert(demo.sections.some((item) => item.fields.some((candidate) => candidate.id === field.visibleWhen.field)), `condition source for ${field.id} does not exist`)
  }
  for (const group of section.repeatableGroups ?? []) {
    assert(group.id && group.title?.en && group.title?.am && group.help?.en && group.help?.am, `group in ${section.id} needs an id and bilingual copy`)
    assert(Number.isInteger(group.minItems) && group.minItems >= 0 && Number.isInteger(group.maxItems) && group.maxItems > 0 && group.minItems <= group.maxItems, `group ${group.id} has invalid bounds`)
    assert(group.fields.some((field) => field.id === group.uniqueField), `group ${group.id} uniqueField must refer to one of its fields`)
    assert(group.fields.some((field) => field.id === group.uniqueField && field.type === 'select'), `group ${group.id} uniqueness must be based on a controlled choice in this demo`)
    for (const field of group.fields) {
      assert(fieldTypes.has(field.type) && typeof field.required === 'boolean' && field.label?.en && field.label?.am, `group field ${field.id} is invalid`)
      if (field.type === 'select') assert(Array.isArray(field.options) && field.options.length > 0, `select ${field.id} needs options`)
    }
  }
}

console.log(`Validated schema-v1.json, DV-2027 (0 unverified fields), and ${demo.sections.length} synthetic sections.`)
