import sample from '../../../config/dv-cycles/schema-demo.json'

export const schemaDraftStorageKey = `ethio-dv-schema-sample-v${sample.schemaVersion}-c${sample.configVersion}`

export function clearSchemaWizardDraft() {
  try { sessionStorage.removeItem(schemaDraftStorageKey) } catch { /* The demo can be reset without storage access. */ }
}
