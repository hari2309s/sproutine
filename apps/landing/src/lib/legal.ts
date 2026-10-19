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

export const LAST_UPDATED = '19 October 2026'

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
      'Sproutine is a small, independent project based in Berlin, Germany. We are the controller for the personal data described here under the EU General Data Protection Regulation (GDPR).',
    ]),
    s('what', 'What we collect', [
      'Account details: your email address and a password, used to sign you in and to send password-reset emails.',
      'Profile: your name, diet, allergies, dislikes, budget and, if you choose, a quit-smoking date and nutrient goals. All of it is optional except your name.',
      'Logs: meals, water, habits, meal plans and, if you use the Body tab, weigh-ins. In gentle mode, weigh-ins are hidden but kept until you delete them.',
    ]),
    s('ai', 'AI and your data', [
      'Rosie uses a language model to understand what you say or type. Messages about your health are only sent to that model after you give explicit consent during onboarding, and you can withdraw it in Settings.',
      'Nutrition values never come from the model. They come from the food databases listed below.',
    ]),
    s('sources', 'Food data sources', [
      'BLS 4.0 (Bundeslebensmittelschlüssel, Max Rubner-Institut), licensed CC BY 4.0. Open Food Facts, licensed ODbL. USDA FoodData Central, public domain. Product lookups by barcode send only the barcode, never your identity.',
    ]),
    s('payments', 'Payments', [
      'If you subscribe to Pro, payments are handled by our payment provider. We receive your subscription status and billing country, never your full card details.',
    ]),
    s('rights', 'Your rights', [
      'You can access, correct, export or delete your data at any time from Settings, or by writing to us. You also have the right to complain to a data protection authority, such as the Berlin Commissioner for Data Protection and Freedom of Information.',
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
    'Sproutine is free to start for personal wellness, with an optional Pro plan. It isn’t medical advice, please be kind to it and to yourself, and you can stop using it and take your data with you whenever you like.',
  sections: [
    s('service', 'The service', [
      'Sproutine is an open-source food companion that helps you log meals, plan your week and notice gentle patterns. The source code is available under the MIT licence.',
    ]),
    s('plans', 'Free, Pro and the trial', [
      'Sproutine Free has no time limit. Sproutine Pro adds Rosie, the AI companion: chat, voice logging, photo logging and planning meals from free text.',
      'Every new account gets 14 days of Pro without payment details. When the trial ends, your account returns to Free and keeps everything you have logged.',
      'If you subscribe, Pro renews monthly or yearly until you cancel in Settings. You keep Pro until the end of the period you have paid for. Statutory withdrawal rights for consumers apply.',
    ]),
    s('medical', 'Not medical advice', [
      'Sproutine offers general wellness guidance only. It doesn’t diagnose, treat or prevent any condition. If you have a medical condition, are pregnant, or are living with an eating disorder, please talk to a qualified professional.',
      'If you are in crisis, call TelefonSeelsorge on 0800 111 0 111 (free, 24/7) or 112 in an emergency.',
    ]),
    s('account', 'Your account', [
      'You need a valid email address to create an account. Keep your password safe, and access to that inbox, because password-reset links are sent there. You must be at least 16 years old to use Sproutine.',
    ]),
    s('use', 'Fair use', [
      'Please don’t misuse the service, try to break it, or use it to harm others. We may pause accounts that do. Pro includes generous daily limits on AI use to keep the service running for everyone.',
    ]),
    s('changes', 'Changes', [
      'If these terms or prices change in a meaningful way, we’ll tell you in the app at least 30 days before the change takes effect.',
    ]),
    s('law', 'Governing law', [
      'These terms are governed by German law. Mandatory consumer protections in your country of residence still apply.',
    ]),
  ],
}
