import type { Allergen, Diet } from '@sproutine/types'
import type { VoiceId } from './voices'
import type { Theme } from '@/hooks/useTheme'

export type Locale = 'en'

export interface Translations {
  auth: {
    tagline: string
    intro: string
    rosieName: string
    rosieRole: string
    greeting: string
    ask: string
    emailLabel: string
    emailPlaceholder: string
    invalidEmail: string
    continueWithEmail: string
    sending: string
    footer: string
    checkEmail: string
    magicLinkSent: (email: string) => string
    differentEmail: string
    demoButton: string
    demoHint: string
    disclaimer: string
  }
  onboarding: {
    intro: string
    languageLabel: string
    nameLabel: string
    namePlaceholder: string
    dietLabel: string
    allergiesLabel: string
    allergiesHint: string
    dislikesLabel: string
    dislikesPlaceholder: string
    budgetLabel: string
    budgetPlaceholder: string
    perWeek: string
    optional: string
    quitDateLabel: string
    quitDateHint: string
    voiceLabel: string
    consentLabel: string
    privacyPolicy: string
    required: string
    disclaimer: string
    consentHint: string
    saving: string
    continue: string
    errorSave: string
  }
  diets: Record<Diet, string>
  allergens: Record<Allergen, string>
  voices: {
    groupLabel: string
    descriptions: Record<VoiceId, string>
    sample: string
    stop: string
    playSample: (name: string) => string
    stopSample: (name: string) => string
  }
  tour: {
    steps: Array<{ title: string; body: string }>
    illustrations: {
      logUser: string
      logRosie: string
      logged: string
      weekTitle: string
      weekBudget: string
      weekDays: Array<[string, string]>
      habits: string[]
      missedDay: string
    }
    next: string
    letsGo: string
    skip: string
  }
  today: {
    goodMorning: string
    goodAfternoon: string
    goodEvening: string
    emptyTitle: string
    emptyBody: string
    talkToRosie: string
    comingSoon: string
    upcoming: string[]
  }
  nav: {
    today: string
    chat: string
  }
  topBar: {
    settings: string
    signOut: string
  }
  theme: Record<Theme, string> & { label: string }
  settings: {
    title: string
    close: string
    language: string
    appearance: string
    voice: string
    gentleMode: string
    gentleModeDesc: string
    gentleModeOn: string
    yourData: string
    downloadData: string
    preparing: string
    dangerZone: string
    deleteAccountDesc: string
    deleteConfirmLabel: string
    deleteConfirmWord: string
    deleting: string
    deleteMyAccount: string
    keepAccount: string
    deleteError: string
    disclaimer: string
    dataSources: string
  }
  chat: {
    rosieName: string
    rosieRole: string
    soundOn: string
    muted: string
    emptyTitle: string
    emptyBody: string
    suggestions: string[]
    holdToTalk: string
    releaseToSend: string
    recording: string
    listening: string
    transcribing: string
    speaking: string
    rosieSpeaking: string
    stopSpeaking: string
    typing: string
    typePlaceholder: string
    send: string
    notSent: string
    resend: string
    helpful: string
    notHelpful: string
    thanks: string
    anErrorOccurred: string
  }
  safety: {
    crisis: {
      title: string
      body: string
      helplineLabel: string
      emergencyLabel: string
      closing: string
    }
    edRisk: { title: string; body: string; helplineLabel: string; closing: string }
  }
  home: {
    authExpiredError: string
    demoUnavailableError: string
  }
  cookieBanner: {
    message: string
    details: string
    essentialOnly: string
    acceptAll: string
  }
  scanner: {
    title: string
    close: string
    torchOn: string
    torchOff: string
    pointTitle: string
    pointBody: string
    typeTitle: string
    typeBody: string
    typeInstead: string
    lookUp: string
    tellRosie: string
    cameraUnavailable: string
  }
  states: {
    loading: string
    errorTitle: string
    errorBody: string
    retry: string
    backToToday: string
  }
}

export const translations: Record<Locale, Translations> = {
  en: {
    auth: {
      tagline: 'Eat well, one sprout at a time.',
      intro:
        'Talk or type to Rosie. Log what you ate, get a weekly plan that fits your diet and budget, and pick up small habits that stick.',
      rosieName: 'Rosie',
      rosieRole: 'Your food friend',
      greeting: "Hi, I'm Rosie. I'll help you eat well, one small routine at a time.",
      ask: "What's your email? I'll send you a link to sign in. New here? The same link creates your account.",
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      invalidEmail: 'That email looks incomplete. Check the part after @.',
      continueWithEmail: 'Continue with email',
      sending: 'Sending…',
      footer: 'No password needed',
      checkEmail: 'Check your email',
      magicLinkSent: (email) =>
        `I sent a magic link to ${email}. Tap it on this device to sign in. It works for one hour.`,
      differentEmail: 'Use a different email',
      demoButton: 'Explore the demo',
      demoHint: 'or look around first',
      disclaimer: 'Sproutine offers general food ideas, not medical advice.',
    },
    onboarding: {
      intro:
        "I'm Rosie. A few quick questions so I can suggest food you'll actually enjoy. It takes about a minute, and you can change anything later.",
      languageLabel: 'Language',
      nameLabel: 'What should I call you?',
      namePlaceholder: 'Your first name',
      dietLabel: 'How do you eat?',
      allergiesLabel: 'Any allergies?',
      allergiesHint: "Pick all that apply. I'll keep them out of every suggestion.",
      dislikesLabel: "Anything you'd rather not eat?",
      dislikesPlaceholder: 'e.g. olives, mushrooms',
      budgetLabel: 'Weekly food budget',
      budgetPlaceholder: 'e.g. 50',
      perWeek: 'per week',
      optional: 'Optional',
      quitDateLabel: 'Quit smoking recently? When?',
      quitDateHint:
        'Appetite and cravings often shift after quitting. If you tell me, I can plan with that in mind.',
      voiceLabel: 'Pick my voice',
      consentLabel:
        'I agree that Sproutine processes what I share about my eating to give me suggestions.',
      privacyPolicy: 'Privacy policy',
      required: 'Required',
      disclaimer:
        'Sproutine offers general food ideas, not medical advice. For health questions, please talk to your doctor.',
      consentHint:
        'Tick the consent box to continue. Everything else is optional except your name.',
      saving: 'Saving…',
      continue: 'Continue',
      errorSave: "I couldn't save that. Please try again.",
    },
    diets: {
      omnivore: 'Everything',
      vegetarian: 'Vegetarian',
      vegan: 'Vegan',
      pescatarian: 'Pescatarian',
    },
    allergens: {
      gluten: 'Gluten',
      crustaceans: 'Crustaceans',
      eggs: 'Eggs',
      fish: 'Fish',
      peanuts: 'Peanuts',
      soybeans: 'Soy',
      milk: 'Milk',
      nuts: 'Tree nuts',
      celery: 'Celery',
      mustard: 'Mustard',
      sesame: 'Sesame',
      sulphites: 'Sulphites',
      lupin: 'Lupin',
      molluscs: 'Molluscs',
    },
    voices: {
      groupLabel: "Rosie's voice",
      descriptions: {
        rosie: 'Warm and bright',
        niamh: 'Soft, with an Irish lilt',
        isla: 'Calm and unhurried',
      },
      sample: 'Sample',
      stop: 'Stop',
      playSample: (name) => `Play a sample of ${name}`,
      stopSample: (name) => `Stop ${name}'s sample`,
    },
    tour: {
      steps: [
        {
          title: 'Just tell me',
          body: 'Talk or type, like you would to a friend. No searching, no scanning, no weighing.',
        },
        {
          title: 'Plans that fit your week',
          body: 'Meals built around your diet, allergies and budget, with a shopping list for Rewe, Edeka, Aldi or Lidl.',
        },
        {
          title: 'Small steps, no guilt',
          body: 'No scores and no good or bad food. Just gentle nudges toward routines that feel good. Gentle mode can hide numbers any time.',
        },
      ],
      illustrations: {
        logUser: 'Had a Brezel and a cappuccino on the way to work',
        logRosie: "Nice. I've added that as breakfast.",
        logged: 'Logged',
        weekTitle: 'Your week',
        weekBudget: 'Aldi · about €38',
        weekDays: [
          ['Mon', 'Red lentil soup with bread'],
          ['Tue', 'Veggie pasta, big salad'],
          ['Wed', 'Ofengemüse with feta'],
          ['Thu', 'Kartoffel-Quark bowls'],
        ],
        habits: ['One extra veg at dinner', 'Water with lunch', 'A slow breakfast'],
        missedDay: "Missed a day? That's just a day. We'll pick it up tomorrow.",
      },
      next: 'Next',
      letsGo: "Let's go",
      skip: 'Skip',
    },
    today: {
      goodMorning: 'Good morning',
      goodAfternoon: 'Good afternoon',
      goodEvening: 'Good evening',
      emptyTitle: 'Nothing logged yet',
      emptyBody: 'Tell Rosie what you had. A quick note or a voice message is plenty.',
      talkToRosie: 'Talk to Rosie',
      comingSoon: 'Coming soon',
      upcoming: ['Weekly meal plan', 'Shopping lists for Rewe, Edeka, Aldi, Lidl', 'Gentle nudges'],
    },
    nav: {
      today: 'Today',
      chat: 'Chat',
    },
    topBar: {
      settings: 'Settings',
      signOut: 'Sign out',
    },
    theme: {
      label: 'Theme',
      light: 'Light',
      dark: 'Dark',
      system: 'System',
    },
    settings: {
      title: 'Settings',
      close: 'Close settings',
      language: 'Language',
      appearance: 'Appearance',
      voice: "Rosie's voice",
      gentleMode: 'Gentle mode',
      gentleModeDesc:
        'Hides calories, grams, portions and targets everywhere. Rosie still notes your meals and keeps you company.',
      gentleModeOn: 'On. Numbers, portions and targets are hidden.',
      yourData: 'Your data',
      downloadData: 'Download my data',
      preparing: 'Preparing…',
      dangerZone: 'Danger zone',
      deleteAccountDesc:
        "Deleting your account removes your profile, meals and chats for good. It can't be undone.",
      deleteConfirmLabel: 'Type DELETE to confirm',
      deleteConfirmWord: 'DELETE',
      deleting: 'Deleting…',
      deleteMyAccount: 'Delete my account',
      keepAccount: 'Keep my account',
      deleteError: "I couldn't delete your account. Please try again.",
      disclaimer: 'Sproutine offers general food ideas, not medical advice.',
      dataSources: 'Food data from Open Food Facts (ODbL) and USDA FoodData Central.',
    },
    chat: {
      rosieName: 'Rosie',
      rosieRole: 'Your food friend',
      soundOn: 'Sound on',
      muted: 'Muted',
      emptyTitle: "What's on your plate today?",
      emptyBody: "Tell me what you ate, ask me anything about food, or let's plan your week.",
      suggestions: [
        'I had muesli for breakfast',
        'Plan my meals for this week',
        'Easy snacks for cravings',
      ],
      holdToTalk: 'Hold to talk',
      releaseToSend: 'Release to send',
      recording: 'Recording',
      listening: 'Listening…',
      transcribing: 'Transcribing…',
      speaking: 'Speaking',
      rosieSpeaking: 'Rosie is speaking · Tap to stop',
      stopSpeaking: 'Stop Rosie speaking',
      typing: 'Rosie is typing',
      typePlaceholder: 'Or type a message…',
      send: 'Send message',
      notSent: 'Not sent',
      resend: 'Resend',
      helpful: 'Helpful',
      notHelpful: 'Not helpful',
      thanks: 'Thanks!',
      anErrorOccurred: 'Rosie had trouble answering. Please try again.',
    },
    safety: {
      crisis: {
        title: "I'm really glad you told me.",
        body: "You don't have to carry this on your own. If you'd like to talk to someone now, these lines are free, confidential and open day and night.",
        helplineLabel: 'TelefonSeelsorge · free, 24/7',
        emergencyLabel: "If you're in immediate danger",
        closing: "I'm still here if you want to keep talking.",
      },
      edRisk: {
        title: 'Thank you for telling me.',
        body: "It sounds like food might feel really hard right now. I'll step back from numbers and targets and keep things gentle. If you'd like to talk to someone who knows this well, this line offers free, confidential first advice.",
        helplineLabel: 'BIÖG eating-disorder line · Mon–Thu 10–22, Fri–Sun 10–18',
        closing: "Whenever you're ready, I'm still here to chat about food in a relaxed way.",
      },
    },
    home: {
      authExpiredError: 'That sign-in link has expired or was already used. Ask me for a new one.',
      demoUnavailableError: 'The demo is taking a break. Please try again in a moment.',
    },
    cookieBanner: {
      message:
        'We use essential cookies to keep you signed in. Optional analytics help us improve.',
      details: 'Details',
      essentialOnly: 'Essential only',
      acceptAll: 'Accept all',
    },
    scanner: {
      title: 'Scan a barcode',
      close: 'Close scanner',
      torchOn: 'Turn on the light',
      torchOff: 'Turn off the light',
      pointTitle: 'Point at the barcode',
      pointBody: "Hold the pack steady inside the frame. I'll look it up for you.",
      typeTitle: 'Type the barcode',
      typeBody: 'The numbers under the bars, usually 8 or 13 digits.',
      typeInstead: 'Type the barcode instead',
      lookUp: 'Look up',
      tellRosie: 'Or just tell Rosie what it is',
      cameraUnavailable: "I can't use the camera here. You can type the barcode instead.",
    },
    states: {
      loading: 'Setting the table…',
      errorTitle: 'Something went wrong',
      errorBody: "That one's on us, not you. Your meals and chats are safe.",
      retry: 'Try again',
      backToToday: 'Back to Today',
    },
  },
}

export const LOCALE_LABELS: Record<Locale, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
}
