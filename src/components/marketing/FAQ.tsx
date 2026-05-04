import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need a North merchant account to use Vibe & Pay?',
    a: 'Yes. Vibe & Pay is a chat layer over the North Embedded Checkout API, so you need an active North account with API access. Sandbox credentials are perfect for trying it out.',
  },
  {
    q: 'How are my North credentials stored?',
    a: 'Your API key, checkout ID, and profile ID are encrypted with AES-256-GCM before they ever hit the database. The decryption key lives only on the server, and credentials are decrypted per request — never stored in plain text.',
  },
  {
    q: 'What can the AI actually do?',
    a: 'It can send checkouts and invoices, generate reusable payment links, refund or void transactions, and add or update customers. It can also pull reports — revenue this week, top customers, overdue invoices — without any clicking around.',
  },
  {
    q: 'Will it ever charge a customer without my approval?',
    a: 'No. Anything that creates, modifies, or refunds money renders a confirmation card with editable fields. Nothing executes until you click confirm.',
  },
  {
    q: 'Does my customer need an account to pay?',
    a: 'No. They click the link in the email, land on a branded payment page, and check out via the North-embedded form. The whole flow is optimized for phones.',
  },
  {
    q: 'Do you support languages other than English?',
    a: 'The merchant UI ships in English and Spanish. Each customer has a preferred-language flag, and outbound emails and payment pages route on it automatically.',
  },
  {
    q: 'How fast does payment status reach me?',
    a: 'A polling job checks open sessions every minute and pushes a status update straight into the chat thread that started the transaction. Most paid notifications land within sixty seconds of the customer hitting submit.',
  },
  {
    q: 'Is this open source?',
    a: 'It was built for a hackathon and the source is on GitHub. You can self-host or use the hosted version — both run on the same code.',
  },
]

export function FAQ() {
  return (
    <section className="relative px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">
            Questions, answered
          </h2>
          <p className="mt-4 text-lg text-[var(--text-muted)]">
            If you have one that isn&apos;t here, ask in chat once you sign up.
          </p>
        </div>

        <div className="mt-12 rounded-xl border border-[var(--brand-border)] bg-[var(--surface)]/60 px-6 backdrop-blur-sm">
          <Accordion>
            {FAQS.map((item, i) => (
              <AccordionItem key={item.q} value={`faq-${i}`}>
                <AccordionTrigger className="py-5 text-base font-medium text-[var(--text)]">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="pr-8 text-[var(--text-muted)]">{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
