export type Locale = 'en'

export interface Translations {
  auth: {
    tagline: string
    emailPlaceholder: string
    invalidEmail: string
    continueWithEmail: string
    sending: string
    footer: string
    checkEmail: string
    magicLinkSent: (email: string) => string
    demoButton: string
    demoHint: string
  }
  onboarding: {
    heading: string
    subtitle: string
    nameLabel: string
    namePlaceholder: string
    currencyLabel: string
    saving: string
    continue: string
    errorSave: string
    languageLabel: string
    voiceLabel: string
    voiceHint: string
  }
  tour: {
    steps: Array<{ emoji: string; title: string; body: string }>
    next: string
    letsGo: string
    skip: string
  }
  settings: {
    title: string
    yourData: string
    downloadData: string
    downloadDataDesc: string
    exportData: string
    preparing: string
    dangerZone: string
    deleteAccount: string
    deleteAccountDesc: string
    deletePlaceholder: string
    deleteConfirmWord: string
    deleting: string
    deleteMyAccount: string
    deleteError: string
    language: string
    currency: string
    voice: string
    voiceDesc: string
  }
  dashboard: {
    goodMorning: string
    goodAfternoon: string
    goodEvening: string
    recent: string
    scan: string
    csv: string
    add: string
    cancel: string
    signOut: string
    settingsLabel: string
  }
  nav: {
    home: string
    chat: string
    insights: string
  }
  home: {
    authExpiredError: string
    demoUnavailableError: string
  }
  categories: Record<string, string>
  addTransaction: {
    title: string
    expense: string
    income: string
    descriptionPlaceholder: string
    amountLabel: string
    dateLabel: string
    categoryLabel: string
    saving: string
    add: string
  }
  transactions: {
    noTransactions: string
    noTransactionsHint: string
    filteredCount: (filtered: number, total: number) => string
    count: (n: number) => string
    clear: string
    exportCSV: string
    noMatching: string
    noThisMonth: string
    loadMonth: (label: string) => string
    deleteConfirm: string
    cancel: string
    delete: string
    edit: string
    descriptionPlaceholder: string
    merchantPlaceholder: string
    save: string
  }
  csvImport: {
    title: string
    hint: string
    tapToSelect: string
    parseError: string
    transactionsFound: (n: number) => string
    selectedOf: (selected: number, total: number) => string
    showLess: string
    showMore: (n: number) => string
    cancel: string
    import: (n: number) => string
    importing: string
    imported: (n: number) => string
    done: string
    importFailed: string
  }
  receiptUpload: {
    title: string
    hint: string
    tapToSelect: string
    fileTypes: string
    invalidFile: string
    fileTooLarge: (maxMb: number) => string
    changeFile: string
    analysing: string
    extractTransactions: string
    transactionsFound: (n: number) => string
    tryAgain: string
    import: (n: number) => string
    importing: string
    imported: (n: number) => string
    done: string
    noTransactions: string
    parseError: string
    importFailed: string
    somethingWrong: string
  }
  weeklySummary: {
    title: string
    readAloud: string
    playing: string
    spent: (amount: string) => string
    earned: (amount: string) => string
    topCategory: (label: string) => string
    dismiss: string
  }
  financialBrief: {
    addTransactions: string
    endOfMonth: string
    projectedBalance: string
    current: string
    addForForecast: string
    income: string
    expenses: string
    netBalance: string
    noDataThisMonth: string
    confidence: { high: string; medium: string; low: string }
  }
  filter: {
    searchPlaceholder: string
    filters: string
    all: string
    expenses: string
    income: string
    datePresets: Record<string, string>
  }
  insights: {
    title: string
    monthForecast: string
    addTransactionsForForecast: string
    spendingCalendar: string
    monthlyBudgets: string
    newBudget: string
    savingsGoals: string
    newGoal: string
    savingHabits: string
    recurringSubscriptions: string
    lastCharged: string
    detected: (months: number) => string
    thingsToReview: string
    noUnusualActivity: string
    projectedEndOfMonth: string
    perMonth: string
  }
  savingsGoals: {
    title: string
    newGoal: string
    cancel: string
    noGoals: string
    deadlinePassed: string
    daysLeft: (days: number) => string
    complete: string
    addFunds: string
    add: string
    goalNamePlaceholder: string
    targetAmount: string
    creating: string
    createGoal: string
    remaining: (amount: string) => string
    deleteGoal: string
    deleteConfirm: string
  }
  savingsHabits: {
    noHabits: string
    periodWeek: string
    periodMonth: string
    totalSaved: (amount: string) => string
    done: string
    log: string
    frequencyWeekly: string
    frequencyMonthly: string
  }
  monthlyBudgets: {
    noBudgets: string
    allCategoriesHaveBudget: string
    over: (amount: string) => string
    left: (amount: string) => string
    budgetLabel: (amount: string) => string
    monthlyLimit: string
    saving: string
    setBudget: string
    removeBudget: string
    deleteConfirm: string
  }
  cookieBanner: {
    message: string
    accept: string
    reject: string
    privacyLabel: string
  }
  topBar: {
    subtitle: string
    signOut: string
    settingsLabel: string
  }
  chat: {
    holdButton: string
    suggestions: string[]
    typePlaceholder: string
    send: string
    stop: string
    mute: string
    unmute: string
    failedToSend: string
    resend: string
    anErrorOccurred: string
  }
  proposals: {
    goal: {
      addToGoals: string
      noThanks: string
      yesAddIt: string
      saving: string
      error: string
      addedToGoals: (emoji: string, name: string) => string
    }
    transaction: {
      logThis: string
      noThanks: string
      add: string
      saving: string
      error: string
    }
    habit: {
      weeklyLabel: string
      monthlyLabel: string
      logEachPeriod: (period: string) => string
      notNow: string
      startSaving: string
      settingUp: string
      error: string
    }
  }
}

export const translations: Record<Locale, Translations> = {
  en: {
    auth: {
      tagline: 'Your finances, unearthed.',
      emailPlaceholder: 'your@email.com',
      invalidEmail: 'Enter a valid email address.',
      continueWithEmail: 'Continue with email',
      sending: 'Sending...',
      footer: 'Sign in with a magic link · No password needed',
      checkEmail: 'Check your email',
      magicLinkSent: (email) =>
        `We sent a magic link to ${email}. Click it to sign in — no password needed.`,
      demoButton: 'Explore the demo →',
      demoHint: 'A furnished account with sample data. No sign-up.',
    },
    onboarding: {
      heading: 'Welcome to Truffle',
      subtitle: "Let's get you set up in 30 seconds.",
      nameLabel: 'What should we call you?',
      namePlaceholder: 'Your first name',
      currencyLabel: 'Your currency',
      saving: 'Saving...',
      continue: 'Continue →',
      errorSave: 'Failed to save your details — please try again.',
      languageLabel: 'Language',
      voiceLabel: "Truffle's voice",
      voiceHint: 'Tap play to hear each one. You can change this later in Settings.',
    },
    tour: {
      steps: [
        {
          emoji: '💬',
          title: 'Chat naturally',
          body: "Just talk to Truffle like you'd text a friend. Ask how you're doing, log an expense, or get advice — voice or text.",
        },
        {
          emoji: '💶',
          title: 'Track every euro',
          body: 'Every transaction is automatically categorised. Add by chat, CSV import, or snap a receipt.',
        },
        {
          emoji: '🔔',
          title: 'Get smart nudges',
          body: 'Truffle watches for budget overruns, unusual spends, and saving streaks — and tells you before things go sideways.',
        },
      ],
      next: 'Next',
      letsGo: "Let's go →",
      skip: 'Skip tour',
    },
    settings: {
      title: 'Settings',
      yourData: 'Your data',
      downloadData: 'Download all my data',
      downloadDataDesc: 'Transactions, goals, budgets, and habits exported as JSON',
      exportData: 'Export data',
      preparing: 'Preparing…',
      dangerZone: 'Danger zone',
      deleteAccount: 'Delete account',
      deleteAccountDesc: 'Permanently deletes all your data. This cannot be undone.',
      deletePlaceholder: 'Type "DELETE" to confirm',
      deleteConfirmWord: 'DELETE',
      deleting: 'Deleting…',
      deleteMyAccount: 'Delete my account',
      deleteError: 'Failed to delete account. Please try again.',
      language: 'Language',
      currency: 'Currency',
      voice: 'Voice',
      voiceDesc: 'The voice Truffle uses when reading replies aloud.',
    },
    dashboard: {
      goodMorning: 'Good morning',
      goodAfternoon: 'Good afternoon',
      goodEvening: 'Good evening',
      recent: 'Recent',
      scan: 'Scan',
      csv: 'CSV',
      add: '+ Add',
      cancel: 'Cancel',
      signOut: 'Sign out',
      settingsLabel: 'Settings',
    },
    nav: {
      home: 'Home',
      chat: 'Chat',
      insights: 'Insights',
    },
    home: {
      authExpiredError: 'Sign-in link expired or already used. Please request a new one.',
      demoUnavailableError: 'The demo is temporarily unavailable. Please try again in a moment.',
    },
    categories: {
      food_groceries: 'Groceries',
      food_delivery: 'Food Delivery',
      transport: 'Transport',
      housing: 'Housing',
      utilities: 'Utilities',
      subscriptions: 'Subscriptions',
      health: 'Health',
      entertainment: 'Entertainment',
      shopping: 'Shopping',
      income: 'Income',
      savings: 'Savings',
      other: 'Other',
    },
    addTransaction: {
      title: 'Add Transaction',
      expense: 'Expense',
      income: 'Income',
      descriptionPlaceholder: 'Description (e.g. Coffee at Rewe)',
      amountLabel: 'Amount',
      dateLabel: 'Date',
      categoryLabel: 'Category',
      saving: 'Saving...',
      add: 'Add Transaction',
    },
    transactions: {
      noTransactions: 'No transactions yet.',
      noTransactionsHint: 'Add one below to get started.',
      filteredCount: (filtered, total) => `${filtered} of ${total} transactions`,
      count: (n) => `${n} transactions`,
      clear: 'Clear',
      exportCSV: 'Export CSV',
      noMatching: 'No matching transactions.',
      noThisMonth: 'No transactions this month yet.',
      loadMonth: (label) => `Load ${label}`,
      deleteConfirm: 'Delete this transaction?',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      descriptionPlaceholder: 'Description',
      merchantPlaceholder: 'Merchant (optional)',
      save: 'Save',
    },
    csvImport: {
      title: 'Import CSV',
      hint: 'date, description, amount',
      tapToSelect: 'Tap to select a CSV file',
      parseError:
        'Could not parse the CSV. Make sure it has date, description, and amount columns.',
      transactionsFound: (n) =>
        `${n} transaction${n !== 1 ? 's' : ''} found — select which to import`,
      selectedOf: (selected, total) => `${selected} of ${total} selected`,
      showLess: 'Show less',
      showMore: (n) => `+${n} more`,
      cancel: 'Cancel',
      import: (n) => `Import ${n}`,
      importing: 'Importing…',
      imported: (n) => `${n} transaction${n !== 1 ? 's' : ''} imported`,
      done: 'Done',
      importFailed: 'Import failed. Please try again.',
    },
    receiptUpload: {
      title: 'Scan receipt / statement',
      hint: 'image or PDF',
      tapToSelect: 'Tap to select a receipt or bank statement',
      fileTypes: 'JPEG · PNG · WEBP · PDF',
      invalidFile: 'Please choose an image (JPEG, PNG, WEBP) or a PDF.',
      fileTooLarge: (maxMb) => `File is too large — maximum size is ${maxMb} MB.`,
      changeFile: 'Change file',
      analysing: 'Analysing…',
      extractTransactions: 'Extract transactions',
      transactionsFound: (n) =>
        `${n} transaction${n !== 1 ? 's' : ''} found — review before importing`,
      tryAgain: 'Try again',
      import: (n) => `Import ${n}`,
      importing: 'Importing…',
      imported: (n) => `${n} transaction${n !== 1 ? 's' : ''} imported`,
      done: 'Done',
      noTransactions: 'No transactions found. Make sure the receipt or statement is legible.',
      parseError: 'Could not parse the file. Try a clearer image.',
      importFailed: 'Import failed. Please try again.',
      somethingWrong: 'Something went wrong. Please try again.',
    },
    weeklySummary: {
      title: 'Weekly summary',
      readAloud: 'Read aloud',
      playing: 'Playing…',
      spent: (amount) => `This week you spent ${amount}`,
      earned: (amount) => ` and earned ${amount}`,
      topCategory: (label) => `. Most went on ${label}.`,
      dismiss: 'Dismiss',
    },
    financialBrief: {
      addTransactions: 'Add some transactions to see your financial brief',
      endOfMonth: 'End of Month',
      projectedBalance: 'projected balance',
      current: 'Current',
      addForForecast: 'Add a transaction for this month to see your forecast',
      income: 'Income',
      expenses: 'Expenses',
      netBalance: 'net balance',
      noDataThisMonth: 'no data this month',
      confidence: { high: 'high confidence', medium: 'medium confidence', low: 'low confidence' },
    },
    filter: {
      searchPlaceholder: 'Search transactions…',
      filters: 'Filters',
      all: 'All',
      expenses: 'Expenses',
      income: 'Income',
      datePresets: {
        all: 'All time',
        week: 'This week',
        month: 'This month',
        last_month: 'Last month',
        '3months': '3 months',
      },
    },
    insights: {
      title: 'Insights',
      monthForecast: 'Month Forecast',
      addTransactionsForForecast: 'Add transactions to see your forecast',
      spendingCalendar: 'Spending Calendar',
      monthlyBudgets: 'Monthly Budgets',
      newBudget: '+ New budget',
      savingsGoals: 'Savings Goals',
      newGoal: '+ New goal',
      savingHabits: 'Saving Habits',
      recurringSubscriptions: 'Recurring Subscriptions',
      lastCharged: 'Last charged',
      detected: (months) => `detected ${months} month${months !== 1 ? 's' : ''}`,
      thingsToReview: 'Things to Review',
      noUnusualActivity: 'No unusual activity detected',
      projectedEndOfMonth: 'Projected end of month',
      perMonth: '/mo',
    },
    savingsGoals: {
      title: 'Savings Goals',
      newGoal: '+ New goal',
      cancel: 'Cancel',
      noGoals: 'No goals yet — set one to start saving towards something',
      deadlinePassed: 'deadline passed',
      daysLeft: (days) => `${days}d left`,
      complete: 'Complete!',
      addFunds: '+ Add funds',
      add: 'Add',
      goalNamePlaceholder: 'Goal name (e.g. Amsterdam trip)',
      targetAmount: 'Target amount',
      creating: 'Creating…',
      createGoal: 'Create goal',
      remaining: (amount) => `${amount} remaining`,
      deleteGoal: 'Delete goal',
      deleteConfirm: 'Delete this goal?',
    },
    savingsHabits: {
      noHabits: 'No saving habits yet — ask Truffle to set one up',
      periodWeek: 'week',
      periodMonth: 'month',
      totalSaved: (amount) => `${amount} total saved`,
      done: '✓ done',
      log: '+ Log',
      frequencyWeekly: 'Weekly',
      frequencyMonthly: 'Monthly',
    },
    monthlyBudgets: {
      noBudgets: 'No budgets yet — set one to track category spending',
      allCategoriesHaveBudget: 'All spendable categories already have a budget.',
      over: (amount) => `${amount} over`,
      left: (amount) => `${amount} left`,
      budgetLabel: (amount) => `budget ${amount}/mo`,
      monthlyLimit: 'Monthly limit',
      saving: 'Saving…',
      setBudget: 'Set budget',
      removeBudget: 'Remove budget',
      deleteConfirm: 'Delete this budget?',
    },
    cookieBanner: {
      message:
        'We use analytics cookies to understand how Truffle is used and improve the experience.',
      accept: 'Accept',
      reject: 'Reject',
      privacyLabel: 'Privacy Policy',
    },
    topBar: {
      subtitle: 'Ask me anything',
      signOut: 'Sign out',
      settingsLabel: 'Settings',
    },
    chat: {
      holdButton: 'Hold the button and ask anything.',
      suggestions: [
        'How am I doing this month?',
        'What did I spend on food?',
        'Can I afford a weekend trip?',
      ],
      typePlaceholder: 'Or type your question...',
      send: 'Send message',
      stop: 'Stop',
      mute: 'Mute voice',
      unmute: 'Unmute voice',
      failedToSend: 'Failed to send',
      resend: 'Resend',
      anErrorOccurred: 'An error occurred.',
    },
    proposals: {
      goal: {
        addToGoals: 'Add this to your goals?',
        noThanks: 'No thanks',
        yesAddIt: 'Yes, add it',
        saving: 'Saving…',
        error: 'Something went wrong — please try again.',
        addedToGoals: (emoji, name) =>
          `${emoji} ${name} added to your goals — find it in Insights.`,
      },
      transaction: {
        logThis: 'Log this transaction?',
        noThanks: 'No thanks',
        add: 'Add',
        saving: 'Saving…',
        error: 'Something went wrong — please try again.',
      },
      habit: {
        weeklyLabel: 'Weekly saving habit',
        monthlyLabel: 'Monthly saving habit',
        logEachPeriod: (period) => `You log each ${period} yourself in Insights`,
        notNow: 'Not now',
        startSaving: 'Start saving',
        settingUp: 'Setting up…',
        error: 'Something went wrong — please try again.',
      },
    },
  },
}

export const LOCALE_LABELS: Record<Locale, { flag: string; label: string }> = {
  en: { flag: '🇬🇧', label: 'English' },
}
