/**
 * `UUID.nameUUIDFromBytes` de Java (UUID v3 : MD5 du nom, bits de version et de variante) : sert à retrouver côté
 * client un identifiant que le serveur dérive de façon déterministe, comme la salle d'un défi accepté
 * (`ChallengeRoomId.of` : `room:` + identifiant du défi), sans relire le serveur.
 */
export function nameUuid(name: string): string {
  const bytes = md5(new TextEncoder().encode(name))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x30
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16,
  23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
]
const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0)

/** MD5 (RFC 1321) d'un tableau d'octets. */
function md5(input: Uint8Array): Uint8Array {
  const length = input.length
  const padded = new Uint8Array((((length + 8) >> 6) + 1) * 64)
  padded.set(input)
  padded[length] = 0x80
  const bits = length * 8
  const view = new DataView(padded.buffer)
  view.setUint32(padded.length - 8, bits >>> 0, true)
  view.setUint32(padded.length - 4, Math.floor(bits / 2 ** 32), true)

  let a0 = 0x67452301
  let b0 = 0xefcdab89
  let c0 = 0x98badcfe
  let d0 = 0x10325476
  for (let offset = 0; offset < padded.length; offset += 64) {
    const m = Array.from({ length: 16 }, (_, i) => view.getUint32(offset + i * 4, true))
    let a = a0
    let b = b0
    let c = c0
    let d = d0
    for (let i = 0; i < 64; i += 1) {
      let f: number
      let g: number
      if (i < 16) {
        f = (b & c) | (~b & d)
        g = i
      } else if (i < 32) {
        f = (d & b) | (~d & c)
        g = (5 * i + 1) % 16
      } else if (i < 48) {
        f = b ^ c ^ d
        g = (3 * i + 5) % 16
      } else {
        f = c ^ (b | ~d)
        g = (7 * i) % 16
      }
      const next = (a + f + (K[i] ?? 0) + (m[g] ?? 0)) >>> 0
      a = d
      d = c
      c = b
      const shift = S[i] ?? 0
      b = (b + ((next << shift) | (next >>> (32 - shift)))) >>> 0
    }
    a0 = (a0 + a) >>> 0
    b0 = (b0 + b) >>> 0
    c0 = (c0 + c) >>> 0
    d0 = (d0 + d) >>> 0
  }
  const out = new Uint8Array(16)
  const outView = new DataView(out.buffer)
  ;[a0, b0, c0, d0].forEach((word, i) => outView.setUint32(i * 4, word, true))
  return out
}
