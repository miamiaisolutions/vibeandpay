'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useTranslations } from 'next-intl'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { Loader2, KeyRound, CheckCircle2, Languages } from 'lucide-react'
import { auth, db } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Language = 'en' | 'es'

type MerchantSnapshot = {
  businessName: string
  language: Language
  hasNorthCredentials: boolean
}

export default function SettingsPage() {
  const t = useTranslations('Settings')
  const [user, setUser] = useState<User | null>(null)
  const [snapshot, setSnapshot] = useState<MerchantSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Form fields
  const [businessName, setBusinessName] = useState('')
  const [language, setLanguage] = useState<Language>('en')
  const [editingCreds, setEditingCreds] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [checkoutId, setCheckoutId] = useState('')
  const [profileId, setProfileId] = useState('')

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (!u) {
        setLoading(false)
        return
      }
      try {
        const ref = doc(db, 'merchants', u.uid)
        const snap = await getDoc(ref)
        const data = snap.data() ?? {}
        const next: MerchantSnapshot = {
          businessName: typeof data.businessName === 'string' ? data.businessName : '',
          language: ((data.language as Language | undefined) ?? 'en'),
          hasNorthCredentials: Boolean(data.northCredentialsCipher),
        }
        setSnapshot(next)
        setBusinessName(next.businessName)
        setLanguage(next.language)
        setEditingCreds(!next.hasNorthCredentials)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load settings.')
      } finally {
        setLoading(false)
      }
    })
  }, [])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user) return
    setError(null)
    setSuccess(null)
    setSaving(true)
    try {
      const idToken = await user.getIdToken()
      const body: Record<string, unknown> = {}
      if (businessName.trim() && businessName.trim() !== snapshot?.businessName) {
        body.businessName = businessName.trim()
      }
      if (language !== snapshot?.language) {
        body.language = language
      }
      if (editingCreds && apiKey && checkoutId && profileId) {
        body.northCredentials = {
          apiKey: apiKey.trim(),
          checkoutId: checkoutId.trim(),
          profileId: profileId.trim(),
        }
      }
      if (Object.keys(body).length === 0) {
        setSuccess(t('nothingToSave'))
        setSaving(false)
        return
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errBody = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(errBody.error ?? 'Save failed.')
      }

      setSuccess(t('saved'))
      setSnapshot((s) => ({
        businessName: businessName.trim() || (s?.businessName ?? ''),
        language,
        hasNorthCredentials:
          Boolean(body.northCredentials) || Boolean(s?.hasNorthCredentials),
      }))
      if (body.northCredentials) {
        setEditingCreds(false)
        setApiKey('')
        setCheckoutId('')
        setProfileId('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6 w-full">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="text-sm text-[var(--text-muted)]">{t('subtitle')}</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('businessSection')}</CardTitle>
            <CardDescription>{t('businessSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">{t('businessNameLabel')}</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Acme Co"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent-cyan)]">
                <Languages className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{t('languageSection')}</CardTitle>
                <CardDescription>{t('languageSubtitle')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="language">{t('languageLabel')}</Label>
              <Select
                value={language}
                onValueChange={(v) => setLanguage((v ?? 'en') as Language)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('languageEnglish')}</SelectItem>
                  <SelectItem value="es">{t('languageSpanish')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--surface-elevated)] text-[var(--accent-purple)]">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{t('credentialsSection')}</CardTitle>
                <CardDescription>{t('credentialsSubtitle')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!editingCreds && snapshot?.hasNorthCredentials && (
              <div className="flex items-center justify-between rounded-md border border-[var(--brand-border)] bg-[var(--surface-elevated)] px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
                  {t('credentialsSaved')}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingCreds(true)}
                >
                  {t('credentialsReplace')}
                </Button>
              </div>
            )}

            {editingCreds && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">PRIVATE_API_KEY</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    autoComplete="off"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono"
                    placeholder="north_pk_…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkoutId">CHECKOUT_ID</Label>
                  <Input
                    id="checkoutId"
                    autoComplete="off"
                    value={checkoutId}
                    onChange={(e) => setCheckoutId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profileId">PROFILE_ID</Label>
                  <Input
                    id="profileId"
                    autoComplete="off"
                    value={profileId}
                    onChange={(e) => setProfileId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                {snapshot?.hasNorthCredentials && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingCreds(false)
                      setApiKey('')
                      setCheckoutId('')
                      setProfileId('')
                    }}
                  >
                    {t('credentialsCancel')}
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {error && (
          <div role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </div>
        )}
        {success && (
          <div role="status" className="text-sm text-[var(--success)]">
            {success}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? t('saving') : t('saveChanges')}
          </Button>
        </div>
      </form>
    </div>
  )
}
