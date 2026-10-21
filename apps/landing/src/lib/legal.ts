import { PRICES } from './pricing'

export interface LegalSection {
  id: string
  heading: string
  paragraphs: string[]
}

export interface LegalPage {
  title: string
  summary: string
  sections: LegalSection[]
}

// A drafting aid, not legal advice: have these pages reviewed before launch.
export const LAST_UPDATED = '21 October 2026'

const s = (id: string, heading: string, paragraphs: string[]): LegalSection => ({
  id,
  heading,
  paragraphs,
})

export const PRIVACY: LegalPage = {
  title: 'Privacy policy',
  summary:
    'Your food log is yours. We collect only what the app needs to work, we never sell it or use it for ads, nothing about your health goes to an AI model without your consent, and you can download or delete everything at any time.',
  sections: [
    s('who', 'Who we are', [
      'Sproutine is a small, independent project based in Berlin, Germany. The controller for the personal data described here under the EU General Data Protection Regulation (GDPR) is the person named in our Impressum (legal notice), reachable at the contact address below.',
    ]),
    s('what', 'What we collect and why', [
      'Account details: your email address and a password, to sign you in and send password-reset emails (GDPR Art. 6(1)(b), to provide the service).',
      'Profile and logs: your name, diet, allergies, dislikes, budget, goals and, if you choose, a quit-smoking date; plus meals, water, habits, meal plans and, if you use the Body tab, weigh-ins. Information about what you eat and your weight is health data, which we process only with your explicit consent given during onboarding (Art. 9(2)(a)). You can withdraw it at any time in Settings.',
      'Subscription: your plan, trial dates and subscription status, to give you the features you pay for (Art. 6(1)(b)).',
      'Security: limited technical data such as request counts, to keep the service running and stop abuse (Art. 6(1)(f)).',
    ]),
    s('ai', 'AI and your data', [
      'Rosie uses language and speech models to understand what you say, type or photograph. Those messages are sent to the AI providers listed below only after you have given consent, under a pseudonym rather than your name or email.',
      'Nutrition values never come from a model. They come from the food databases listed below.',
    ]),
    s('processors', 'Who processes data for us', [
      'Hosting and database: Vercel Inc. (USA) runs the app; Supabase Inc. stores your account and logs.',
      'AI: depending on availability, Groq Inc. (USA), Google LLC (Gemini, USA), Mistral AI (France) and Cerebras Systems Inc. (USA). We use paid tiers under data processing agreements, which do not allow your data to be used for training.',
      'Payments: Stripe Payments Europe Ltd. (Ireland) processes payments and invoices for Pro.',
      'Quality and analytics: Langfuse (EU region) records pseudonymised AI traces so we can fix mistakes; PostHog (EU region) collects usage statistics only if you allow them.',
      'Bot protection: Cloudflare Inc. (USA) checks sign-ups with Turnstile.',
      'Where a provider is in the USA, the transfer is based on the EU–US Data Privacy Framework or the European Commission’s standard contractual clauses (Art. 45 and 46 GDPR).',
    ]),
    s('sources', 'Food data sources', [
      'BLS 4.0 (Bundeslebensmittelschlüssel, Max Rubner-Institut), licensed CC BY 4.0. Open Food Facts, licensed ODbL. USDA FoodData Central, public domain. Searches and barcode lookups send only the search words or barcode, never your identity.',
    ]),
    s('retention', 'How long we keep it', [
      'We keep your account and logs until you delete them or your account. Deleting your account removes your data from our database straight away and cancels any subscription.',
      'Invoices and payment records are kept for the periods German tax law requires (up to 10 years), with access restricted to that purpose.',
    ]),
    s('rights', 'Your rights', [
      'You can access, correct, export or delete your data at any time from Settings, or by writing to us. You may also object to processing, ask us to restrict it, and withdraw consent at any time without affecting what happened before.',
      'You have the right to complain to a data protection authority, such as the Berlin Commissioner for Data Protection and Freedom of Information.',
    ]),
    s('cookies', 'Cookies', [
      'This website sets no cookies and loads no trackers. It remembers your light or dark theme in your browser’s local storage only.',
      'In the app, essential cookies keep you signed in. Anonymous usage statistics are only collected if you allow them in the app’s cookie banner.',
    ]),
  ],
}

export const TERMS: LegalPage = {
  title: 'Terms of use',
  summary:
    'Sproutine is free to start for personal wellness, with an optional Pro plan you can cancel anytime. It isn’t medical advice, please be kind to it and to yourself, and you can take your data with you whenever you like.',
  sections: [
    s('service', 'The service', [
      'Sproutine is an open-source food companion that helps you log meals, plan your week and notice gentle patterns. The source code is available under the MIT licence. The hosted app is provided by the person named in our Impressum.',
    ]),
    s('plans', 'Free, Pro and the trial', [
      'Sproutine Free has no time limit. Sproutine Pro adds Rosie, the AI companion: chat, voice logging and photo logging.',
      'Every new account gets 14 days of Pro without payment details. The trial ends on its own: your account returns to Free and keeps everything you have logged. Nothing is charged unless you subscribe.',
    ]),
    s('prices', 'Prices and payment', [
      `Pro costs ${PRICES.monthly.price} a month or ${PRICES.yearly.price} a year, including VAT where it applies. Payment is taken in advance for each period by Stripe, our payment provider.`,
      'Your subscription renews automatically at the end of each period until you cancel it. If we change the price, we tell you at least 30 days before it applies to you, and you can cancel before then.',
    ]),
    s('cancel', 'Cancelling', [
      'You can cancel at any time, effective at the end of the current period, in Settings → Subscription or on our “Cancel a subscription” page. You keep Pro until the end of the period you have paid for, then return to Free with all your data.',
    ]),
    s('withdrawal', 'Your right of withdrawal', [
      'If you are a consumer, you can withdraw from a Pro subscription within 14 days of subscribing, without giving a reason, by telling us clearly, for example by email to the address below.',
      'Pro starts as soon as you subscribe, at your request. If you withdraw, you pay only for the days of Pro you had before withdrawing, and we refund the rest within 14 days.',
    ]),
    s('medical', 'Not medical advice', [
      'Sproutine offers general wellness guidance only. It doesn’t diagnose, treat or prevent any condition. If you have a medical condition, are pregnant, or are living with an eating disorder, please talk to a qualified professional.',
      'If you are in crisis, call TelefonSeelsorge on 0800 111 0 111 (free, 24/7) or 112 in an emergency. Safety features and helplines are never behind a paywall.',
    ]),
    s('account', 'Your account', [
      'You need a valid email address to create an account. Keep your password safe, and access to that inbox, because password-reset links are sent there. You must be at least 16 years old to use Sproutine.',
    ]),
    s('use', 'Fair use', [
      'Please don’t misuse the service, try to break it, or use it to harm others. We may pause accounts that do. Pro includes generous daily limits on AI use to keep the service running for everyone.',
    ]),
    s('changes', 'Changes', [
      'If these terms change in a meaningful way, we’ll tell you in the app at least 30 days before the change takes effect.',
    ]),
    s('law', 'Governing law', [
      'These terms are governed by German law. Mandatory consumer protections in your country of residence still apply.',
    ]),
  ],
}

export function imprintPage(imprint: {
  name: string
  address: string[]
  phone: string
  vatId: string
  email: string
}): LegalPage {
  const who = imprint.name
    ? [imprint.name, ...imprint.address]
    : ['Set NEXT_PUBLIC_IMPRINT_NAME and NEXT_PUBLIC_IMPRINT_ADDRESS to fill in this page.']
  return {
    title: 'Impressum',
    summary: 'Who runs Sproutine and how to reach us. The legal notice German law requires.',
    sections: [
      s('provider', 'Angaben gemäß § 5 DDG (provider)', who),
      s('contact', 'Kontakt (contact)', [
        `Email: ${imprint.email}`,
        ...(imprint.phone ? [`Phone: ${imprint.phone}`] : []),
      ]),
      ...(imprint.vatId
        ? [
            s('vat', 'Umsatzsteuer-ID (VAT ID)', [
              `VAT identification number under § 27a UStG: ${imprint.vatId}`,
            ]),
          ]
        : []),
      s('responsible', 'Verantwortlich für den Inhalt (responsible for content)', [
        `Under § 18 (2) MStV: ${imprint.name || 'see above'}, address as above.`,
      ]),
      s('disputes', 'Verbraucherstreitbeilegung (consumer disputes)', [
        'We are neither willing nor obliged to take part in dispute resolution proceedings before a consumer arbitration board. If something isn’t right, please write to us and we’ll sort it out.',
      ]),
    ],
  }
}
