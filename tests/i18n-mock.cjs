// Double de `@/lib/i18n` pour les tests node : textes français réels de `@joutio/client/i18n`, sans Expo ni stockage.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function loadEsm(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)((id) => loadEsm(path.join(path.dirname(file), id)), module, module.exports)
  return module.exports
}

const shared = loadEsm(path.join(__dirname, '../node_modules/@joutio/client/dist/i18n/index.js'))
const t = (key, values) => shared.translate('fr', key, values)
const labels = {
  REASON_LABEL: { QUESTION: 'workshop.reasonQuestion', IMAGE: 'workshop.reasonImage', ANSWERS: 'workshop.reasonAnswers' },
  LANGUAGE_NAME: { fr: 'Français', en: 'English' },
}

module.exports = {
  ...shared,
  ...labels,
  t,
  useT: () => t,
  useLanguage: () => 'fr',
  currentLanguage: () => 'fr',
  deviceLanguage: () => 'fr',
  useLanguageStore: Object.assign(() => 'fr', { getState: () => ({ language: 'fr', setLanguage() {} }) }),
  questionsLabel: (_t, count) => t(count > 1 ? 'workshop.questionsMany' : 'workshop.questionsOne', { count }),
  reportsLabel: (_t, count) => t(count > 1 ? 'workshop.reportsMany' : 'workshop.reportsOne', { count }),
  reasonsLabel: (_t, reasons) => reasons.map((reason) => t(labels.REASON_LABEL[reason])).join(', '),
}
