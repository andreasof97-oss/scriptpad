// ScriptPad — Internationalization (EN/ES)

const translations = {
  en: {
    // Header
    appName: 'ScriptPad',

    // Search
    searchPlaceholder: 'Search scripts...',

    // Sections
    pinned: 'Pinned',
    folders: 'Folders',
    allScripts: 'All Scripts',
    recent: 'Recent',
    uncategorized: 'Uncategorized',
    searchResults: 'Search Results',

    // Actions
    newScript: '+ New Script',
    newFolder: '+ New Folder',
    copyAll: 'Copy All',
    copy: 'Copy',
    edit: 'Edit',
    pin: 'Pin',
    unpin: 'Unpin',
    move: 'Move',
    delete: 'Delete',
    save: 'Save',
    cancel: 'Cancel',
    back: '←',
    close: 'Close',

    // Script form
    scriptTitle: 'Script Title',
    scriptTitlePlaceholder: 'e.g., Opening Script',
    scriptBody: 'Script Body',
    scriptBodyPlaceholder: 'Write your script here...',
    tags: 'Tags',
    tagsPlaceholder: 'Add tags (comma separated)',
    folder: 'Folder',
    noFolder: 'No Folder',
    selectFolder: 'Select folder...',

    // Folder form
    folderName: 'Folder Name',
    folderNamePlaceholder: 'e.g., Openers',
    renameFolder: 'Rename Folder',
    deleteFolder: 'Delete Folder',
    deleteFolderConfirm: 'Delete this folder? Scripts inside will be moved to Uncategorized.',

    // Dialogs
    deleteConfirm: 'Delete this script?',
    deleteConfirmText: 'This action cannot be undone.',
    confirmDelete: 'Yes, Delete',

    // Toast messages
    copied: 'Copied to clipboard! ✓',
    saved: 'Script saved! ✓',
    deleted: 'Script deleted',
    folderCreated: 'Folder created! ✓',
    folderDeleted: 'Folder deleted',
    folderRenamed: 'Folder renamed! ✓',
    imported: 'Scripts imported! ✓',
    importError: 'Invalid file format',
    exported: 'Scripts exported! ✓',

    // Settings
    settings: 'Settings',
    theme: 'Theme',
    dark: 'Dark',
    light: 'Light',
    language: 'Language',
    importExport: 'Import / Export',
    importScripts: 'Import Scripts (JSON)',
    exportScripts: 'Export Scripts (JSON)',
    about: 'About',
    version: 'Version',
    keyboardShortcuts: 'Keyboard Shortcuts',
    shortcutOpen: 'Open ScriptPad',
    shortcutSearch: 'Focus search',
    shortcutNavigate: 'Navigate scripts',
    shortcutExpand: 'Expand script',
    shortcutClose: 'Close / Go back',

    // Empty states
    noScripts: 'No scripts yet',
    noScriptsHint: 'Create your first script to get started!',
    noResults: 'No results found',
    noResultsHint: 'Try a different search term',
    noPinned: 'No pinned scripts',
    noPinnedHint: 'Pin your most-used scripts for quick access',

    // Onboarding
    onboardingWelcome: 'Welcome to ScriptPad ⚡',
    onboardingSubtitle: 'Your scripts. Always ready. One click away.',
    onboardingStep1Title: 'Organize Your Scripts',
    onboardingStep1Desc: 'Create folders, tag your scripts, and find anything instantly with fuzzy search.',
    onboardingStep1Icon: '📁',
    onboardingStep2Title: 'Copy in One Click',
    onboardingStep2Desc: 'Click any script to open it, then copy to clipboard instantly — right in the middle of a call.',
    onboardingStep2Icon: '📋',
    onboardingStep3Title: 'Keyboard-First Speed',
    onboardingStep3Desc: 'Press / to search, arrow keys to navigate, Enter to open. Never leave the keyboard.',
    onboardingStep3Icon: '⌨️',
    onboardingStep4Title: 'Dark Mode & Bilingual',
    onboardingStep4Desc: 'Easy on the eyes with dark mode. Switch between English and Español anytime.',
    onboardingStep4Icon: '🌙',
    onboardingNext: 'Next',
    onboardingBack: 'Back',
    onboardingGetStarted: 'Get Started!',
    onboardingSkip: 'Skip',

    // Misc
    updatedAgo: 'Updated',
    justNow: 'just now',
    minutesAgo: 'min ago',
    hoursAgo: 'h ago',
    daysAgo: 'd ago',
    scripts: 'scripts',
    script: 'script',
  },
  es: {
    // Header
    appName: 'ScriptPad',

    // Search
    searchPlaceholder: 'Buscar scripts...',

    // Sections
    pinned: 'Fijados',
    folders: 'Carpetas',
    allScripts: 'Todos los Scripts',
    recent: 'Recientes',
    uncategorized: 'Sin categoría',
    searchResults: 'Resultados',

    // Actions
    newScript: '+ Nuevo Script',
    newFolder: '+ Nueva Carpeta',
    copyAll: 'Copiar Todo',
    copy: 'Copiar',
    edit: 'Editar',
    pin: 'Fijar',
    unpin: 'Desfijar',
    move: 'Mover',
    delete: 'Eliminar',
    save: 'Guardar',
    cancel: 'Cancelar',
    back: '←',
    close: 'Cerrar',

    // Script form
    scriptTitle: 'Título del Script',
    scriptTitlePlaceholder: 'ej., Script de Apertura',
    scriptBody: 'Cuerpo del Script',
    scriptBodyPlaceholder: 'Escribe tu script aquí...',
    tags: 'Etiquetas',
    tagsPlaceholder: 'Agregar etiquetas (separadas por coma)',
    folder: 'Carpeta',
    noFolder: 'Sin Carpeta',
    selectFolder: 'Seleccionar carpeta...',

    // Folder form
    folderName: 'Nombre de Carpeta',
    folderNamePlaceholder: 'ej., Aperturas',
    renameFolder: 'Renombrar Carpeta',
    deleteFolder: 'Eliminar Carpeta',
    deleteFolderConfirm: 'Eliminar carpeta? Los scripts se moverán a Sin Categoría.',

    // Dialogs
    deleteConfirm: '¿Eliminar este script?',
    deleteConfirmText: 'Esta acción no se puede deshacer.',
    confirmDelete: 'Sí, Eliminar',

    // Toast messages
    copied: '¡Copiado al portapapeles! ✓',
    saved: '¡Script guardado! ✓',
    deleted: 'Script eliminado',
    folderCreated: '¡Carpeta creada! ✓',
    folderDeleted: 'Carpeta eliminada',
    folderRenamed: '¡Carpeta renombrada! ✓',
    imported: '¡Scripts importados! ✓',
    importError: 'Formato de archivo inválido',
    exported: '¡Scripts exportados! ✓',

    // Settings
    settings: 'Configuración',
    theme: 'Tema',
    dark: 'Oscuro',
    light: 'Claro',
    language: 'Idioma',
    importExport: 'Importar / Exportar',
    importScripts: 'Importar Scripts (JSON)',
    exportScripts: 'Exportar Scripts (JSON)',
    about: 'Acerca de',
    version: 'Versión',
    keyboardShortcuts: 'Atajos de Teclado',
    shortcutOpen: 'Abrir ScriptPad',
    shortcutSearch: 'Enfocar búsqueda',
    shortcutNavigate: 'Navegar scripts',
    shortcutExpand: 'Expandir script',
    shortcutClose: 'Cerrar / Volver',

    // Empty states
    noScripts: 'No hay scripts',
    noScriptsHint: '¡Crea tu primer script para comenzar!',
    noResults: 'Sin resultados',
    noResultsHint: 'Intenta con otro término de búsqueda',
    noPinned: 'Sin scripts fijados',
    noPinnedHint: 'Fija tus scripts más usados para acceso rápido',

    // Onboarding
    onboardingWelcome: '¡Bienvenido a ScriptPad ⚡',
    onboardingSubtitle: 'Tus scripts. Siempre listos. A un clic.',
    onboardingStep1Title: 'Organiza Tus Scripts',
    onboardingStep1Desc: 'Crea carpetas, etiqueta tus scripts y encuentra todo al instante con búsqueda inteligente.',
    onboardingStep1Icon: '📁',
    onboardingStep2Title: 'Copia en Un Clic',
    onboardingStep2Desc: 'Haz clic en cualquier script para abrirlo y cópialo al portapapeles al instante — en plena llamada.',
    onboardingStep2Icon: '📋',
    onboardingStep3Title: 'Velocidad con Teclado',
    onboardingStep3Desc: 'Presiona / para buscar, flechas para navegar, Enter para abrir. Sin tocar el mouse.',
    onboardingStep3Icon: '⌨️',
    onboardingStep4Title: 'Modo Oscuro y Bilingüe',
    onboardingStep4Desc: 'Fácil para tus ojos con modo oscuro. Cambia entre English y Español cuando quieras.',
    onboardingStep4Icon: '🌙',
    onboardingNext: 'Siguiente',
    onboardingBack: 'Atrás',
    onboardingGetStarted: '¡Comenzar!',
    onboardingSkip: 'Omitir',

    // Misc
    updatedAgo: 'Actualizado',
    justNow: 'ahora',
    minutesAgo: 'min',
    hoursAgo: 'h',
    daysAgo: 'd',
    scripts: 'scripts',
    script: 'script',
  }
};

let currentLanguage = 'en';

function setLanguage(lang) {
  currentLanguage = lang;
}

function t(key) {
  return translations[currentLanguage]?.[key] || translations.en[key] || key;
}

function detectLanguage() {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  return browserLang.startsWith('es') ? 'es' : 'en';
}
