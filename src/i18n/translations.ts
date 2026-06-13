/**
 * Translation resources. The keys below cover the cross-cutting UI
 * (settings, common actions); feature screens adopt them incrementally.
 * Adding a language is a matter of dropping another entry here.
 */
export const resources = {
  en: {
    translation: {
      common: {
        save: 'Save',
        cancel: 'Cancel',
        done: 'Done',
        delete: 'Delete',
      },
      settings: {
        title: 'Settings',
        storeProfile: 'Store profile',
        storeName: 'Store name',
        address: 'Address',
        taxRate: 'Tax rate %',
        currency: 'Currency',
        receipt: 'Receipt',
        receiptHeader: 'Header text',
        receiptFooter: 'Footer text',
        showLogo: 'Show logo on receipts',
        appearance: 'Appearance',
        language: 'Language',
        staff: 'Staff & roles',
        about: 'About',
        saved: 'Settings saved',
      },
      language: {
        system: 'System default',
      },
    },
  },
  es: {
    translation: {
      common: { save: 'Guardar', cancel: 'Cancelar', done: 'Hecho', delete: 'Eliminar' },
      settings: {
        title: 'Ajustes',
        storeProfile: 'Perfil de la tienda',
        storeName: 'Nombre de la tienda',
        address: 'Dirección',
        taxRate: 'Impuesto %',
        currency: 'Moneda',
        receipt: 'Recibo',
        receiptHeader: 'Texto de encabezado',
        receiptFooter: 'Texto de pie',
        showLogo: 'Mostrar logo en recibos',
        appearance: 'Apariencia',
        language: 'Idioma',
        staff: 'Personal y roles',
        about: 'Acerca de',
        saved: 'Ajustes guardados',
      },
      language: { system: 'Predeterminado del sistema' },
    },
  },
  ru: {
    translation: {
      common: { save: 'Сохранить', cancel: 'Отмена', done: 'Готово', delete: 'Удалить' },
      settings: {
        title: 'Настройки',
        storeProfile: 'Профиль магазина',
        storeName: 'Название магазина',
        address: 'Адрес',
        taxRate: 'Налог %',
        currency: 'Валюта',
        receipt: 'Чек',
        receiptHeader: 'Текст заголовка',
        receiptFooter: 'Текст внизу',
        showLogo: 'Логотип на чеках',
        appearance: 'Оформление',
        language: 'Язык',
        staff: 'Сотрудники и роли',
        about: 'О приложении',
        saved: 'Настройки сохранены',
      },
      language: { system: 'Как в системе' },
    },
  },
  ar: {
    translation: {
      common: { save: 'حفظ', cancel: 'إلغاء', done: 'تم', delete: 'حذف' },
      settings: {
        title: 'الإعدادات',
        storeProfile: 'ملف المتجر',
        storeName: 'اسم المتجر',
        address: 'العنوان',
        taxRate: 'الضريبة %',
        currency: 'العملة',
        receipt: 'الإيصال',
        receiptHeader: 'نص الرأس',
        receiptFooter: 'نص التذييل',
        showLogo: 'إظهار الشعار على الإيصالات',
        appearance: 'المظهر',
        language: 'اللغة',
        staff: 'الموظفون والأدوار',
        about: 'حول',
        saved: 'تم حفظ الإعدادات',
      },
      language: { system: 'افتراضي النظام' },
    },
  },
} as const;

export type LanguageCode = keyof typeof resources;

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  rtl: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', rtl: false },
  { code: 'es', label: 'Español', rtl: false },
  { code: 'ru', label: 'Русский', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
];

export const RTL_LANGUAGES: LanguageCode[] = ['ar'];
