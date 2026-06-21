export type Locale = "en" | "ar"

export interface Translations {
  common: {
    loading: string
    save: string
    saving: string
    cancel: string
    delete: string
    edit: string
    create: string
    search: string
    noResults: string
    back: string
    confirm: string
    close: string
    startExploring: string
    contactUs: string
    demoAccess: string
    demoAccessDesc: string
    demoMode: string
    welcomeToLiftOps: string
    demoDescription: string
    allDataPrefilled: string
    bookRealDemo: string
    youAreInDemoMode: string
    questionsContact: string
    proTip: string
    help: string
  }
  nav: {
    management: string
    dashboard: string
    myVisits: string
    clients: string
    projects: string
    installationPipeline: string
    inventory: string
    technicians: string
    maintenance: string
    emergencyTickets: string
    settings: string
    logOut: string
  }
  login: {
    title: string
    subtitle: string
    email: string
    emailPlaceholder: string
    password: string
    signIn: string
    signInLoading: string
    loginSuccessful: string
    welcomeBack: string
    loginFailed: string
    demoAccessTitle: string
    termsAndPrivacy: string
  }
  dashboard: {
    title: string
    subtitle: string
    totalProjects: string
    activeInstallations: string
    maintenanceDue: string
    lowStockItems: string
    open: string
    enRoute: string
    inProgress: string
    resolved: string
  }
  clients: {
    title: string
    subtitle: string
  }
  projects: {
    title: string
    subtitle: string
  }
  installation: {
    title: string
    subtitle: string
    inspections: string
    pipeline: string
  }
  inventory: {
    title: string
    subtitle: string
    addItem: string
    addCategory: string
    export: string
  }
  technicians: {
    title: string
    subtitle: string
  }
  maintenance: {
    title: string
    subtitle: string
    projects: string
    calendar: string
    list: string
    checklist: string
    assignVisits: string
    elevatorFleet: string
    newContract: string
  }
  emergency: {
    title: string
    subtitle: string
    newEmergency: string
  }
  finance: {
    title: string
    subtitle: string
  }
  settings: {
    title: string
    subtitle: string
    adminManagement: string
    categoryManagement: string
  }
  myVisits: {
    title: string
    subtitle: string
    maintenanceVisits: string
    emergencyTickets: string
  }
  inspection: {
    title: string
    subtitle: string
  }
  demoGuide: {
    dashboard: { title: string; description: string; tip: string }
    myVisits: { title: string; description: string; tip: string }
    clients: { title: string; description: string; tip: string }
    projects: { title: string; description: string; tip: string }
    installation: { title: string; description: string; tip: string }
    inventory: { title: string; description: string; tip: string }
    technicians: { title: string; description: string; tip: string }
    maintenance: { title: string; description: string; tip: string }
    emergency: { title: string; description: string; tip: string }
    finance: { title: string; description: string; tip: string }
    settings: { title: string; description: string; tip: string }
    assignVisits: { title: string; description: string; tip: string }
    elevators: { title: string; description: string; tip: string }
    inspection: { title: string; description: string; tip: string }
  }
}
