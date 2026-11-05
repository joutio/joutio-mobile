// Icône d'app, icône adaptative Android et image du splash, tirées du logo (`assets/brand/logo-mark.svg`).
// Usage : `npm run icons` après un changement du logo, puis `npx expo prebuild --clean` en local.
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const mark = readFileSync(`${root}assets/brand/logo-mark.svg`, 'utf8')
const tokens = JSON.parse(readFileSync(`${root}src/design-system/tokens.generated.json`, 'utf8'))

/** Fond du carré du logo. */
const TILE = mark.match(/<rect[^>]*fill="([^"]+)"/)?.[1] ?? '#181818'
/** Le « j » et son point, sans le carré. */
const glyph = (mono) => {
  const body = mark.replace(/<svg[^>]*>|<\/svg>/g, '').replace(/<rect[^>]*>(<\/rect>)?/, '')
  return mono ? body.replace(/#E8B04A/gi, '#FFFFFF') : body
}

const svg = (viewBox, content, background) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${background ? `<rect x="-100" y="-100" width="400" height="400" fill="${background}"/>` : ''}${content}</svg>`

const render = (file, source, size) => {
  const png = new Resvg(source, { fitTo: { mode: 'width', value: size }, background: 'rgba(0,0,0,0)' }).render().asPng()
  writeFileSync(`${root}assets/${file}`, png)
  console.log(`assets/${file} (${size} px)`)
}

// iOS : carré plein (le système arrondit), le « j » à 60 % de la hauteur.
render('icon.png', svg('-10 -10 120 120', glyph(false), TILE), 1024)
// Android : le « j » dans la zone sûre (cercle de 66 % du canevas de 108 dp), sur le fond du carré.
render('android-icon-foreground.png', svg('-25 -25 150 150', glyph(false)), 512)
render('android-icon-background.png', svg('0 0 100 100', '', TILE), 512)
render('android-icon-monochrome.png', svg('-25 -25 150 150', glyph(true)), 432)
// Splash : le logo complet, comme la première image de `LaunchScreen`, sur le fond sombre du lancement.
render('splash-icon.png', mark, 1024)
render('favicon.png', mark, 48)
console.log(`fond du splash : ${tokens.color.dark.bg}`)
