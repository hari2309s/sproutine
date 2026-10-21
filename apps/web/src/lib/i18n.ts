import type { Allergen, Diet } from '@sproutine/types'
import type { VoiceId } from './voices'
import type { Theme } from '@/hooks/useTheme'
import type { Aisle, MealSlot, PlanSlot } from '@sproutine/food/client'

export type Locale = 'en'

export interface Translations {
  auth: {
    tagline: string
    intro: string
    rosieName: string
    rosieRole: string
    greeting: string
    askSignUp: string
    askSignIn: string
    modeLabel: string
    modeSignUp: string
    modeSignIn: string
    nameLabel: string
    namePlaceholder: string
    emailLabel: string
    emailPlaceholder: string
    passwordLabel: string
    passwordPlaceholderNew: string
    passwordPlaceholder: string
    showPassword: string
    hidePassword: string
    createAccount: string
    signIn: string
    working: string
    forgotPassword: string
    sendResetLink: string
    backToSignIn: string
    resetAsk: string
    resetSent: (email: string) => string
    confirmEmailSent: (email: string) => string
    invalidEmail: string
    nameRequired: string
    passwordTooShort: string
    invalidCredentials: string
    emailNotConfirmed: string
    alreadyRegistered: string
    rateLimited: string
    genericError: string
    resetTitle: string
    resetIntro: string
    newPasswordLabel: string
    savePassword: string
    passwordSaved: string
    passwordSameAsOld: string
    resetExpired: string
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
    onTheMenu: string
    habitsTitle: string
    habitsEmpty: string
    addHabit: string
    habitPlaceholder: string
    daily: string
    weekly: string
    add: string
    cancel: string
    removeHabit: (title: string) => string
    checkHabit: (title: string) => string
    streakDays: (n: number) => string
    streakWeeks: (n: number) => string
    keptUp: string
    doneThisWeek: string
    habitFailed: string
    rosieLeftNote: string
    noMealLogged: string
  }
  streak: {
    dayStreak: string
    best: (n: number) => string
    freshStart: string
    freshStartSub: string
    backAtIt: string
    gentleLabel: string
    milestone: string
    keepGoing: string
    share: string
    milestoneLines: Record<number, string>
  }
  goals: {
    title: string
    subtitle: string
    setInSettings: string
    setInSettingsSub: string
    of: string
    kcal: string
    protein: string
    carbs: string
    fat: string
    stepsOf: (step: string) => string
    clearAll: string
    settingsHint: string
  }
  weeklyReview: {
    ready: string
    title: string
    weekTotals: string
    energyByDay: string
    avgDashed: string
    bestDay: string
    bestDayPrefix: string
    missedNote: (day: string) => string
    shareWeek: string
    daysOf7: (n: number) => string
    checkedInMost: string
    dailyAvg: string
    mealsLogged: string
    waterAvg: string
    currentStreak: string
  }
  body: {
    title: string
    private: string
    logWeight: string
    weight: string
    date: string
    save: string
    current: string
    start: string
    change: string
    recent: string
    days30: string
    days90: string
    all: string
    emptyHint: string
    lastEntry: (kg: string, date: string) => string
    cancel: string
  }
  nav: {
    today: string
    week: string
    body: string
    chat: string
  }
  week: {
    title: string
    thisWeek: string
    nextWeek: string
    meals: string
    shopping: string
    emptyTitle: string
    emptyBody: string
    quickOnly: string
    planWeek: string
    planning: string
    newPlan: string
    newPlanConfirm: string
    swap: (meal: string) => string
    swapping: string
    leftovers: string
    minutes: (n: number) => string
    ingredients: string
    noRecipe: (slot: string) => string
    overBudget: (cost: string, budget: string) => string
    planFailed: string
    cardTitle: string
    cardTitleNext: string
    droppedWishes: string
    openWeek: string
    loadFailed: string
    retry: string
    swapFailed: string
    nothingElse: string
    planChanged: string
    estimateTotal: (cost: string) => string
    estimateNote: string
    checkPantry: string
    packs: (n: number, size: string) => string
    aisles: Record<Aisle, string>
    slots: Record<PlanSlot, string>
  }
  topBar: {
    settings: string
    signOut: string
  }
  theme: Record<Theme, string> & { label: string; switchTo: string }
  settings: {
    title: string
    close: string
    language: string
    appearance: string
    voice: string
    gentleMode: string
    gentleModeDesc: string
    gentleModeOn: string
    notifications: string
    notificationsDesc: string
    notificationsOn: string
    notificationsHomeScreen: string
    notificationsUnsupported: string
    waterGoal: string
    glassSize: string
    dailyGoals: string
    downloadReport: string
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
    suggestions: { title: string; subtitle: string }[]
    composerPlaceholder: string
    holdToTalk: string
    cancel: string
    rosieThinking: string
    rosieAnalysingPhoto: string
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
    takePhoto: string
    chooseFromLibrary: string
    photoReady: string
    photoReadyHint: string
    addNote: string
    estimatedPortions: string
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
  meal: {
    slots: Record<MealSlot, string>
    mealLabel: string
    gramsOf: string
    remove: string
    notThisOne: string
    notFound: string
    total: string
    atLeast: string
    kcal: string
    protein: string
    carbs: string
    fat: string
    estimateNote: string
    save: string
    saving: string
    notNow: string
    savedTo: string
    notSaved: string
    editSlot: string
    saveFailed: string
    lookupFailed: string
    notFoundBarcode: string
    scanAction: string
    mealsToday: string
    removeMeal: string
    removeFailed: string
    movedTo: string
    moveFrom: string
    orPickAnother: string
    update: string
    updated: string
    undo: string
    keep: string
    deleteMeal: string
    deleted: string
    sourceLabels: Record<string, string>
    copiedFrom: string
  }
  water: {
    title: string
    addGlass: string
    removeGlass: string
    goalReached: string
    glasses: (n: number) => string
  }
  copy: {
    title: string
    subtitle: string
    noYesterday: string
    copied: string
    repeatSlot: (slot: string) => string
  }
  quickAdd: {
    title: string
  }
  search: {
    title: string
    addTo: (slot: string) => string
    placeholder: string
    clear: string
    scan: string
    recent: string
    noRecent: string
    results: (n: number) => string
    searching: string
    noResults: (q: string) => string
    failed: string
    tooMany: string
    scanInstead: string
    per100: string
    pick: (name: string) => string
    back: string
    howMuch: string
    less: string
    more: string
    whichMeal: string
    save: (slot: string) => string
    saving: string
    saveFailed: string
    saved: (slot: string) => string
    gentleNote: string
    today: string
    yesterday: string
    sources: Record<'bls' | 'off' | 'usda' | 'user', string>
    sourcesLong: Record<'bls' | 'off' | 'usda' | 'user', string>
    portion: (unit: string, count: number) => string
  }
  plans: {
    pro: string
    gateTitle: string
    gateBody: string
    benefits: [string, string][]
    monthly: string
    yearly: string
    save: (pct: number) => string
    perYear: (price: string) => string
    perMonth: (price: string) => string
    yearlyNote: (monthly: string) => string
    monthlyNote: string
    startPro: string
    starting: string
    searchInstead: string
    checkoutFailed: string
    supportLine: string
    trialLeft: (days: number) => string
    trialEndingNote: string
    seePlans: string
    keepPro: string
    whatStaysFree: string
    dismiss: string
    endedTitle: string
    endedBody: string
    endedDetail: string
    continueFree: string
    subscription: string
    proName: string
    freeName: string
    trialName: string
    freeBlurb: string
    trialBlurb: (date: string) => string
    renewsOn: (date: string) => string
    endsOn: (date: string) => string
    paymentIssue: string
    intervalLabel: Record<'month' | 'year', string>
    seeWhatProAdds: string
    manage: string
    manageHint: string
    opening: string
    proNote: (date: string) => string
    freeNote: string
    welcome: string
  }
  cancelPage: {
    title: string
    lead: string
    signedOut: string
    signIn: string
    emailUs: string
    nothing: string
    alreadyCancelled: (date: string) => string
    plan: (interval: string, date: string) => string
    whatHappens: string
    confirm: string
    cancelling: string
    done: (date: string) => string
    doneNoDate: string
    doneUndo: string
    emailed: string
    notEmailed: (when: string) => string
    formTitle: string
    name: string
    email: string
    kind: string
    ordinary: string
    extraordinary: string
    reason: string
    sending: string
    requestDone: (when: string, email: string) => string
    requestNoEmail: (when: string) => string
    requestFailed: string
    requestUnavailable: string
    failed: string
    back: string
    settingsLink: string
  }
  reports: {
    title: string
    subtitle: string
    weekly: string
    weeklyDesc: string
    monthly: string
    monthlyDesc: string
  }
  share: {
    title: string
    story: string
    square: string
    privacy: string
    shareButton: string
    sharing: string
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
      askSignUp: "Let's set you up. What should I call you, and how will you sign in?",
      askSignIn: 'Welcome back! Sign in with your email and password.',
      modeLabel: 'Account',
      modeSignUp: 'New here',
      modeSignIn: 'I have an account',
      nameLabel: 'Your name',
      namePlaceholder: 'What should I call you?',
      emailLabel: 'Email address',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholderNew: 'At least 8 characters',
      passwordPlaceholder: 'Your password',
      showPassword: 'Show password',
      hidePassword: 'Hide password',
      createAccount: 'Create account',
      signIn: 'Sign in',
      working: 'One moment…',
      forgotPassword: 'Forgot password?',
      sendResetLink: 'Send reset link',
      backToSignIn: 'Back to sign in',
      resetAsk: "No problem. What's your email? I'll send you a link to set a new password.",
      resetSent: (email) =>
        `If there's an account for ${email}, a link to set a new password is on its way. It works for one hour.`,
      confirmEmailSent: (email) =>
        `Almost there! I sent a confirmation link to ${email}. Tap it, and you're in.`,
      invalidEmail: 'That email looks incomplete. Check the part after @.',
      nameRequired: 'Tell me what to call you.',
      passwordTooShort: 'Use at least 8 characters.',
      invalidCredentials: "That email and password don't match. Try again, or reset your password.",
      emailNotConfirmed: 'Confirm your email first: tap the link I sent you.',
      alreadyRegistered: "There's already an account with that email. Sign in instead.",
      rateLimited: 'Too many tries in a short time. Wait a minute, then try again.',
      genericError: 'Something went wrong on my side. Please try again.',
      resetTitle: 'Set a new password',
      resetIntro: 'Choose a new password for your account.',
      newPasswordLabel: 'New password',
      savePassword: 'Save password',
      passwordSaved: 'Password saved. Taking you in…',
      passwordSameAsOld: 'Pick a password different from your old one.',
      resetExpired:
        'That reset link has expired or was already used. Ask for a new one from the sign-in page.',
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
      onTheMenu: 'On the menu today',
      habitsTitle: 'Habits',
      habitsEmpty: 'One small habit is a good start, like "drink a glass of water with lunch".',
      addHabit: 'Add a habit',
      habitPlaceholder: 'e.g. Fruit with breakfast',
      daily: 'Every day',
      weekly: 'Every week',
      add: 'Add',
      cancel: 'Cancel',
      removeHabit: (title) => `Remove "${title}"`,
      checkHabit: (title) => `Done: ${title}`,
      streakDays: (n) => (n === 1 ? '1 day' : `${n} days in a row`),
      streakWeeks: (n) => (n === 1 ? '1 week' : `${n} weeks in a row`),
      keptUp: 'Keeping it up',
      doneThisWeek: 'Done this week',
      habitFailed: "Couldn't save that. Please try again.",
      rosieLeftNote: 'Rosie left you a note in',
      noMealLogged: 'No meal logged',
    },
    streak: {
      dayStreak: 'day streak',
      best: (n) => `Best ${n}`,
      freshStart: 'Fresh start today',
      freshStartSub: 'Log one meal and we\u2019re off again.',
      backAtIt: 'back at it',
      gentleLabel: 'Checking in most days',
      milestone: 'Logging streak',
      keepGoing: 'Keep going',
      share: 'Share',
      milestoneLines: {
        7: 'A whole week of showing up. That\u2019s how routines start.',
        14: 'Two weeks in. This is starting to feel like yours.',
        30: 'A month of checking in. That\u2019s not a streak any more, it\u2019s a habit.',
        60: 'Sixty days. You\u2019ve built something really steady here.',
        100: 'One hundred days. I\u2019m properly proud of you.',
      },
    },
    goals: {
      title: 'Today\u2019s goals',
      subtitle: 'A guide, not a rule',
      setInSettings: 'Set your daily goals in Settings',
      setInSettingsSub: 'Optional. Rings appear here once you do.',
      of: 'of',
      kcal: 'kcal',
      protein: 'Protein',
      carbs: 'Carbs',
      fat: 'Fat',
      stepsOf: (step) => `Steps of ${step}`,
      clearAll: 'Clear all goals',
      settingsHint:
        'Step any goal down past its lowest value to turn it Off, which hides its ring. With every goal Off, Today shows a gentle prompt instead. Gentle mode hides all goals.',
    },
    weeklyReview: {
      ready: 'Your week in review is ready',
      title: 'Your Week in Review',
      weekTotals: 'Week totals',
      energyByDay: 'Energy by day',
      avgDashed: 'kcal \u00B7 dashed line = average',
      bestDay: 'Best day',
      bestDayPrefix: 'Best day \u00B7',
      missedNote: (day) => `Nothing logged on ${day}. Weekends happen.`,
      shareWeek: 'Share my week',
      daysOf7: (n) => `${n} of 7 days`,
      checkedInMost: 'You checked in almost every day.',
      dailyAvg: 'Daily average',
      mealsLogged: 'Logged this week',
      waterAvg: 'Water, daily average',
      currentStreak: 'Current streak',
    },
    body: {
      title: 'Body',
      private: 'Private to you',
      logWeight: 'Log weight',
      weight: 'Weight',
      date: 'Date',
      save: 'Save',
      current: 'Current',
      start: 'Start',
      change: 'Change',
      recent: 'Recent',
      days30: '30 days',
      days90: '90 days',
      all: 'All',
      emptyHint:
        'Weigh-ins stay private and never appear in shares or chat. After a few entries, your trend shows up here. Weekly is plenty.',
      lastEntry: (kg, date) => `Last entry: ${kg} kg on ${date}`,
      cancel: 'Cancel',
    },
    nav: {
      today: 'Today',
      week: 'Week',
      body: 'Body',
      chat: 'Chat',
    },
    week: {
      title: 'Your week',
      thisWeek: 'This week',
      nextWeek: 'Next week',
      meals: 'Meals',
      shopping: 'Shopping list',
      emptyTitle: 'No plan yet',
      emptyBody:
        "I'll put together breakfasts, lunches and dinners that fit your diet, allergies and budget, from simple dishes you can shop for at Aldi, Lidl, Rewe or Edeka.",
      quickOnly: 'Quick meals only (25 min or less)',
      planWeek: 'Plan my week',
      planning: 'Planning…',
      newPlan: 'New plan',
      newPlanConfirm: 'Replace this week with a fresh plan?',
      swap: (meal) => `Swap ${meal}`,
      swapping: 'Swapping…',
      leftovers: 'Leftovers',
      minutes: (n) => `${n} min`,
      ingredients: 'For one',
      noRecipe: (slot) =>
        `I couldn't find a ${slot} that fits everything you told me. Tell Rosie what you like and I'll learn.`,
      overBudget: (cost, budget) =>
        `This week comes to about ${cost}, a little over your ${budget} budget.`,
      planFailed: "I couldn't make a plan just now. Please try again.",
      cardTitle: 'Dinners this week',
      cardTitleNext: 'Dinners next week',
      droppedWishes:
        "Your wishes left too little to choose from, so I planned without them. Swap anything you'd like in the Week tab.",
      openWeek: 'Open my week',
      loadFailed: "I couldn't load your plan just now.",
      retry: 'Try again',
      swapFailed: "I couldn't swap that just now. Please try again.",
      nothingElse: 'Nothing else fits that slot right now.',
      planChanged: 'Your plan changed in another tab, so I reloaded it.',
      estimateTotal: (cost) => `About ${cost}`,
      estimateNote:
        'Estimated discounter prices, for whole packs. Some will last beyond this week.',
      checkPantry: 'Check you have',
      packs: (n, size) => `${n} × ${size}`,
      aisles: {
        produce: 'Fruit and veg',
        bakery: 'Bakery',
        chilled: 'Chilled',
        meat: 'Meat',
        fish: 'Fish',
        dry: 'Pasta, rice and grains',
        tins: 'Tins and jars',
        frozen: 'Frozen',
        spreads: 'Spreads',
        pantry: 'Pantry',
      },
      slots: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' },
    },
    topBar: {
      settings: 'Settings',
      signOut: 'Sign out',
    },
    theme: {
      label: 'Theme',
      switchTo: 'tap for',
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
      notifications: 'Notifications',
      notificationsDesc: 'Rosie sends a gentle nudge when you haven\u2019t logged a meal, and weekly check-ins.',
      notificationsOn: 'On. You\u2019ll get nudges from Rosie.',
      notificationsHomeScreen: 'Add Sproutine to your Home Screen first to enable notifications.',
      notificationsUnsupported: 'Notifications aren\u2019t supported in this browser.',
      waterGoal: 'Daily goal',
      glassSize: 'Glass size',
      dailyGoals: 'Daily goals',
      downloadReport: 'Download nutrition report',
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
        { title: 'Log a meal', subtitle: 'I had muesli with berries' },
        { title: 'Plan my week', subtitle: 'Dinners under €40 at Aldi' },
        { title: 'Ask about food', subtitle: 'Is Quark a good protein source?' },
      ],
      composerPlaceholder: 'Type, or hold the mic to talk',
      holdToTalk: 'Hold to talk',
      cancel: 'Cancel',
      rosieThinking: 'Rosie is thinking',
      rosieAnalysingPhoto: 'Rosie is looking at your photo\u2026',
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
      takePhoto: 'Take a photo',
      chooseFromLibrary: 'Choose from library',
      photoReady: 'Photo ready',
      photoReadyHint: "I'll guess the portions. You can adjust them afterwards.",
      addNote: 'Add a note (optional)',
      estimatedPortions: 'Estimated portions, from your photo',
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
      authExpiredError:
        'That link has expired or was already used. If you were confirming your email, try signing in.',
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
    meal: {
      slots: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
      mealLabel: 'Which meal',
      gramsOf: 'Grams of',
      remove: 'Remove',
      notThisOne: 'Not this one?',
      notFound: "Couldn't find “{name}”. Try saying it differently, or scan the pack.",
      total: 'Total',
      atLeast: 'at least',
      kcal: 'kcal',
      protein: 'protein',
      carbs: 'carbs',
      fat: 'fat',
      estimateNote: 'Amounts are my best guess. Change them if you know better.',
      save: 'Save',
      saving: 'Saving…',
      notNow: 'Not now',
      savedTo: 'Saved to {slot}',
      notSaved: 'Not saved',
      editSlot: 'Edit',
      saveFailed: "Couldn't save that. Please try again.",
      lookupFailed: "Couldn't look that up right now. Please try again in a moment.",
      notFoundBarcode: "I don't know this product yet. Tell Rosie what it is instead.",
      scanAction: 'Scan',
      mealsToday: 'Today',
      removeMeal: 'Remove this meal',
      removeFailed: "Couldn't remove that. Please try again.",
      movedTo: 'Moved to {slot}',
      moveFrom: '{from}',
      orPickAnother: 'Or pick another',
      update: 'Update',
      updated: 'Updated',
      undo: 'Undo',
      keep: 'Keep',
      deleteMeal: 'Delete',
      deleted: 'Deleted',
      sourceLabels: { bls: 'BLS', off: 'OFF', usda: 'USDA' },
      copiedFrom: 'Copied from yesterday',
    },
    water: {
      title: 'Water',
      addGlass: 'Add a glass of water',
      removeGlass: 'Remove last glass',
      goalReached: 'Goal reached!',
      glasses: (n) => (n === 1 ? '1 glass' : `${n} glasses`),
    },
    copy: {
      title: 'Yesterday\u2019s meals',
      subtitle: 'Tap a meal to log it again today.',
      noYesterday: 'Nothing logged yesterday for this meal.',
      copied: 'Copied from yesterday',
      repeatSlot: (slot: string) => `Repeat ${slot}`,
    },
    quickAdd: {
      title: 'Quick add',
    },
    search: {
      title: 'Find a food',
      addTo: (slot) => `Add to ${slot.toLowerCase()}`,
      placeholder: 'Search foods or brands',
      clear: 'Clear search',
      scan: 'Scan a barcode',
      recent: 'Recent',
      noRecent: 'Foods you log will show up here for next time.',
      results: (n) => (n === 1 ? '1 result' : `${n} results`),
      searching: 'Searching…',
      noResults: (q) => `Nothing found for “${q}”. Try another word, or scan the pack.`,
      failed: 'Search didn’t work just now. Please try again in a moment.',
      tooMany: 'That’s a lot of searching. Give it a minute, then try again.',
      scanInstead: 'Not the right one? Scan the pack instead.',
      per100: 'kcal / 100 g',
      pick: (name) => `Choose ${name}`,
      back: 'Back to search',
      howMuch: 'How much?',
      less: 'Less',
      more: 'More',
      whichMeal: 'Which meal?',
      save: (slot) => `Save to ${slot.toLowerCase()}`,
      saving: 'Saving…',
      saveFailed: 'That didn’t save. Please try again.',
      saved: (slot) => `Saved to ${slot.toLowerCase()}`,
      gentleNote:
        'Gentle mode is on, so amounts and numbers stay hidden. A typical portion is used in the background.',
      today: 'today',
      yesterday: 'yesterday',
      sources: { bls: 'BLS 4.0', off: 'Open Food Facts', usda: 'USDA', user: 'Your food' },
      sourcesLong: {
        bls: 'German food database',
        off: 'Product label',
        usda: 'US food database',
        user: 'Added by you',
      },
      portion: (unit, count) => {
        const nouns: Record<string, [string, string]> = {
          slice: ['slice', 'slices'],
          piece: ['piece', 'pieces'],
          glass: ['glass', 'glasses'],
          cup: ['cup', 'cups'],
          bowl: ['bowl', 'bowls'],
          bar: ['bar', 'bars'],
          handful: ['handful', 'handfuls'],
          tbsp: ['tbsp', 'tbsp'],
          serving: ['serving', 'servings'],
          portion: ['portion', 'portions'],
        }
        if (unit === 'g') return `${count} g`
        const [one, many] = nouns[unit] ?? [unit, unit]
        return `${count} ${count === 1 ? one : many}`
      },
    },
    plans: {
      pro: 'Pro',
      gateTitle: 'Rosie is part of Pro',
      gateBody: 'Talking with Rosie uses AI, and that costs real money. Searching and scanning stay free.',
      benefits: [
        ['Chat with Rosie', 'Questions, ideas, a little encouragement'],
        ['Log by voice', 'Hold to talk, check the grams, save'],
        ['Log from a photo', 'Snap your plate, Rosie suggests the foods'],
      ],
      monthly: 'Monthly',
      yearly: 'Yearly',
      save: (pct) => `Save ${pct}%`,
      perYear: (price) => `${price} a year`,
      perMonth: (price) => `${price} a month`,
      yearlyNote: (monthly) => `About ${monthly} a month · cancel anytime`,
      monthlyNote: 'Billed monthly · cancel anytime',
      startPro: 'Start Pro',
      starting: 'Opening checkout…',
      searchInstead: 'Search instead',
      checkoutFailed: 'Checkout didn’t open. Please try again in a moment.',
      supportLine: 'Need to talk to someone now? TelefonSeelsorge: 0800 111 0 111, free, day and night.',
      trialLeft: (d) => (d === 1 ? 'Pro trial: 1 day left' : `Pro trial: ${d} days left`),
      trialEndingNote: 'After that you’ll be on Free. Everything you’ve logged stays right here.',
      seePlans: 'Plans',
      keepPro: 'Keep Pro',
      whatStaysFree: 'What stays free?',
      dismiss: 'Dismiss',
      endedTitle: 'Your Pro trial has ended',
      endedBody: 'Everything you logged is still here.',
      endedDetail:
        'Search, scan, plans and your calendar keep working on Free. Rosie, voice and photo logging pause until you choose Pro.',
      continueFree: 'Continue with Free',
      subscription: 'Subscription',
      proName: 'Sproutine Pro',
      freeName: 'Sproutine Free',
      trialName: 'Pro trial',
      freeBlurb: 'Search, scan, plans, calendar and reviews. Free for as long as you like.',
      trialBlurb: (date) => `Rosie, voice and photo logging are yours until ${date}.`,
      renewsOn: (date) => `Renews on ${date}`,
      endsOn: (date) => `Ends on ${date}`,
      paymentIssue: 'Your last payment didn’t go through. Please update your card.',
      intervalLabel: { month: 'Monthly', year: 'Yearly' },
      seeWhatProAdds: 'See what Pro adds',
      manage: 'Manage subscription',
      manageHint: 'Change plan, payment or cancel',
      opening: 'Opening…',
      proNote: (date) =>
        `Cancel anytime. You keep Pro until ${date}, then return to Free with all your data.`,
      freeNote: 'Your logs, plans and safety features never depend on a plan.',
      welcome: 'Welcome to Pro. Rosie is all yours.',
    },
    cancelPage: {
      title: 'Verträge hier kündigen',
      lead: 'Cancel a Sproutine Pro subscription. You keep Pro until the end of the period you’ve paid for, then return to Free with all your data.',
      signedOut: 'Sign in to the account that has the subscription, then come back to this page. Can’t sign in? Email us and we’ll cancel it for you.',
      signIn: 'Sign in',
      emailUs: 'Email a cancellation',
      nothing: 'This account has no paid subscription. A Pro trial ends on its own and is never charged.',
      alreadyCancelled: (date) => `Your subscription is already cancelled. Pro ends on ${date}.`,
      plan: (interval, date) => `Sproutine Pro, ${interval.toLowerCase()}. Renews on ${date}.`,
      whatHappens: 'After cancelling, you won’t be charged again. Rosie, voice and photo logging stay on until the date above.',
      confirm: 'Jetzt kündigen · Cancel now',
      cancelling: 'Cancelling…',
      done: (date) => `Your subscription is cancelled. Pro stays on until ${date}, and you won’t be charged again.`,
      doneNoDate: 'Your subscription is cancelled. Pro stays on until the end of the period you’ve paid for, and you won’t be charged again.',
      doneUndo: 'Changed your mind? You can resume it in Settings → Subscription before then.',
      emailed: 'We’ve emailed you a confirmation.',
      notEmailed: (when) =>
        `Cancelled on ${when}. We couldn’t send a confirmation email, so please keep this page (a screenshot is fine) as your confirmation.`,
      formTitle: 'Cancel without signing in',
      name: 'Your name',
      email: 'Email address of your Sproutine account',
      kind: 'Type of cancellation',
      ordinary: 'Ordinary, at the next possible date',
      extraordinary: 'Extraordinary, with immediate effect',
      reason: 'Reason (needed for an extraordinary cancellation)',
      sending: 'Sending…',
      requestDone: (when, email) =>
        `Received on ${when}. We’ve sent a confirmation of receipt to ${email} and will confirm the date your subscription ends in a second email.`,
      requestNoEmail: (when) =>
        `Received on ${when}. Please keep this page (a screenshot is fine) as your confirmation of receipt. We’ll confirm the end date by email.`,
      requestFailed: 'That didn’t send. Please try again, or email us directly.',
      requestUnavailable: 'This form isn’t available right now. Please email us your cancellation instead.',
      failed: 'That didn’t work. Please try again, or email us and we’ll cancel it for you.',
      back: 'Back to Today',
      settingsLink: 'Cancel subscription',
    },
    reports: {
      title: 'Nutrition report',
      subtitle: 'Download a CSV of your meals and daily averages.',
      weekly: 'Last 7 days',
      weeklyDesc: 'Meals, macros and daily averages',
      monthly: 'Last 30 days',
      monthlyDesc: 'A full month of nutrition data',
    },
    share: {
      title: 'Share your day',
      story: 'Story',
      square: 'Square',
      privacy: 'Only the meals you\u2019ve logged today are included. No personal data is shared.',
      shareButton: 'Share',
      sharing: 'Preparing\u2026',
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
