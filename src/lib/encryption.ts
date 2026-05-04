import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY env var must be a 32-byte hex string (64 chars). Generate with: openssl rand -hex 32',
    )
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plain: string): { cipher: string; iv: string } {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    cipher: Buffer.concat([ct, tag]).toString('base64'),
    iv: iv.toString('base64'),
  }
}

export function decrypt(cipherB64: string, ivB64: string): string {
  const key = getKey()
  const data = Buffer.from(cipherB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const ct = data.subarray(0, -16)
  const tag = data.subarray(-16)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
