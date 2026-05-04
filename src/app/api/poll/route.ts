import { NextResponse, type NextRequest } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { getStatus, type NorthCredentials } from '@/lib/north/client'
import { getMerchantCredentials } from '@/lib/north/credentials'
import { getResend, FROM_ADDRESS } from '@/lib/email/client'
import { PaymentReceipt } from '@/lib/email/templates/PaymentReceipt'
import {
  extractNorthTransactionId,
  sanitizeForFirestore,
} from '@/lib/north/extract'

export const maxDuration = 60

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000
const BATCH_LIMIT = 50

type PollResult = {
  txId: string
  merchantId: string
  outcome: 'updated' | 'unchanged' | 'expired' | 'skipped' | 'error'
  newStatus?: string
  error?: string
}

type MerchantBrandData = {
  businessName: string
  brandColor: string
  logoUrl: string | null
}

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json(
      { error: 'CRON_SECRET not configured on server' },
      { status: 500 },
    )
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Oldest lastPolledAt first; null sorts before any timestamp so freshly
  // created transactions get picked up on the first run after they land.
  const snap = await adminDb
    .collectionGroup('transactions')
    .where('pollingActive', '==', true)
    .orderBy('lastPolledAt', 'asc')
    .limit(BATCH_LIMIT)
    .get()

  const credCache = new Map<string, NorthCredentials | null>()
  const merchantBrandCache = new Map<string, MerchantBrandData>()
  const results: PollResult[] = []

  for (const doc of snap.docs) {
    const tx = doc.data() as Record<string, unknown>
    const merchantId = doc.ref.parent.parent?.id
    if (!merchantId) {
      results.push({ txId: doc.id, merchantId: '?', outcome: 'skipped' })
      continue
    }

    // 24-hour cutoff — stop polling regardless of status.
    const sentAtMs =
      (tx.sentAt as Timestamp | undefined)?.toMillis?.() ?? 0
    if (sentAtMs > 0 && Date.now() - sentAtMs > TWENTY_FOUR_HOURS_MS) {
      const currentStatus = String(tx.status ?? '')
      const expiredStatus =
        currentStatus === 'sent' || currentStatus === 'viewed'
          ? 'expired'
          : currentStatus
      try {
        await doc.ref.update({
          pollingActive: false,
          status: expiredStatus,
          lastPolledAt: FieldValue.serverTimestamp(),
        })
        results.push({
          txId: doc.id,
          merchantId,
          outcome: 'expired',
          newStatus: expiredStatus,
        })
      } catch (err) {
        results.push({
          txId: doc.id,
          merchantId,
          outcome: 'error',
          error: err instanceof Error ? err.message : 'expire failed',
        })
      }
      continue
    }

    // Cache decrypted credentials per merchant for this run.
    let creds = credCache.get(merchantId)
    if (creds === undefined) {
      const merchantSnap = await adminDb
        .collection('merchants')
        .doc(merchantId)
        .get()
      const merchantData = (merchantSnap.data() ?? {}) as Record<string, unknown>
      creds = getMerchantCredentials(merchantData)
      credCache.set(merchantId, creds)
      merchantBrandCache.set(merchantId, {
        businessName:
          (merchantData.businessName as string) ||
          (merchantData.displayName as string) ||
          'Your merchant',
        brandColor: (merchantData.brandColor as string) || '#7C3AED',
        logoUrl: (merchantData.logoUrl as string | null) ?? null,
      })
    }

    const sessionToken = tx.northSessionToken as string | null | undefined
    if (!creds || !sessionToken) {
      // Bump lastPolledAt so the next run can move past this tx.
      await doc.ref.update({ lastPolledAt: FieldValue.serverTimestamp() })
      results.push({
        txId: doc.id,
        merchantId,
        outcome: 'skipped',
        error: !creds ? 'no credentials' : 'no session token',
      })
      continue
    }

    try {
      const statusResult = await getStatus(creds, sessionToken)
      const update: Record<string, unknown> = {
        lastPolledAt: FieldValue.serverTimestamp(),
        northSessionStatus: statusResult.status,
      }

      if (statusResult.status === 'Approved') {
        update.status = 'paid'
        update.paidAt = FieldValue.serverTimestamp()
        update.pollingActive = false
        const extractedTxId = extractNorthTransactionId(statusResult)
        if (extractedTxId) {
          update.northTransactionId = extractedTxId
        }
        // Snapshot the full North status response on the tx doc — lets us
        // diagnose which field actually carries the transaction id and
        // gives us a value to fall back on for refund/void.
        update.metadata = {
          ...(tx.metadata as Record<string, unknown> | undefined),
          northStatus: sanitizeForFirestore(statusResult),
        }
      } else if (statusResult.status === 'Declined') {
        update.status = 'failed'
        update.pollingActive = false
      } else if (statusResult.status === 'Verified' && tx.status === 'sent') {
        update.status = 'viewed'
      }

      const previousStatus = tx.status
      const newStatus = (update.status as string | undefined) ?? previousStatus

      await doc.ref.update(update)

      // Append a system message to the originating chat thread (if any).
      if (update.status === 'paid' && previousStatus !== 'paid' && tx.threadId) {
        const threadId = String(tx.threadId)
        try {
          const threadRef = adminDb
            .collection('merchants')
            .doc(merchantId)
            .collection('threads')
            .doc(threadId)
          const threadSnap = await threadRef.get()
          if (threadSnap.exists) {
            const messageCount = Number(threadSnap.data()?.messageCount ?? 0)
            const amount = tx.amount as number
            const customerName = String(tx.customerName ?? 'Customer')
            const text = `✅ ${customerName} just paid $${amount.toFixed(2)}`
            await threadRef.collection('messages').add({
              role: 'system',
              parts: [{ type: 'text', text }],
              sequence: messageCount,
            })
            await threadRef.update({
              messageCount: FieldValue.increment(1),
              lastMessagePreview: text,
              updatedAt: FieldValue.serverTimestamp(),
            })
          }
        } catch (err) {
          console.error(
            '[poll] thread system-message write failed:',
            err instanceof Error ? err.message : err,
          )
        }
      }

      // Send receipt email exactly once when a transaction flips to paid.
      if (update.status === 'paid' && previousStatus !== 'paid') {
        const brand = merchantBrandCache.get(merchantId)
        const customerEmail = tx.emailSentTo as string | null
        const customerName = tx.customerName as string | null
        if (brand && customerEmail && customerName) {
          let customerLanguage: 'en' | 'es' = 'en'
          const customerId = tx.customerId as string | null
          if (customerId) {
            try {
              const cSnap = await adminDb
                .collection('merchants')
                .doc(merchantId)
                .collection('customers')
                .doc(customerId)
                .get()
              if (cSnap.exists && (cSnap.data() ?? {}).preferredLanguage === 'es') {
                customerLanguage = 'es'
              }
            } catch {
              // fall back to 'en'
            }
          }
          const subject =
            customerLanguage === 'es'
              ? `${brand.businessName} — Pago recibido`
              : `${brand.businessName} — Payment received`
          const txId =
            (statusResult.transactionId as string | undefined) || doc.id
          getResend()
            .emails.send({
              from: FROM_ADDRESS,
              to: customerEmail,
              subject,
              react: PaymentReceipt({
                customerName,
                customerLanguage,
                businessName: brand.businessName,
                brandColor: brand.brandColor,
                logoUrl: brand.logoUrl,
                amount: tx.amount as number,
                lineItems:
                  (tx.lineItems as Array<{
                    name: string
                    quantity: number
                    price: number
                  }>) ?? [],
                paidAt: new Date(),
                transactionId: txId,
              }),
            })
            .then((result) => {
              if (result?.error) {
                console.error(
                  '[receipt email] send failed for tx',
                  doc.id,
                  result.error.message ?? result.error,
                )
              }
            })
            .catch((err: unknown) => {
              console.error(
                '[receipt email] send threw for tx',
                doc.id,
                err instanceof Error ? err.message : err,
              )
            })
        }
      }

      // Phase 5 will append a system message into the originating thread
      // when status flips to `paid`. For now we just record the change.

      results.push({
        txId: doc.id,
        merchantId,
        outcome:
          newStatus === previousStatus ? 'unchanged' : 'updated',
        newStatus: newStatus as string,
      })
    } catch (err) {
      // Don't let one bad tx kill the whole batch; bump timestamp + log.
      await doc.ref
        .update({ lastPolledAt: FieldValue.serverTimestamp() })
        .catch(() => {
          /* swallow */
        })
      results.push({
        txId: doc.id,
        merchantId,
        outcome: 'error',
        error: err instanceof Error ? err.message : 'getStatus failed',
      })
    }
  }

  return NextResponse.json({
    checked: snap.size,
    results,
  })
}
