/**
 * Constitution V — Localized Copy, Not Hardcoded Strings.
 *
 * Every user-facing UI string (chrome, buttons, confirmation/error messages)
 * lives here, keyed by id. Components call `t(key)` (see ./index.ts) and never
 * inline a literal string. Adding a locale later means adding a sibling
 * bundle + a registry entry in index.ts — no component changes.
 */
export const ru = {
  nav: {
    home: 'Главная',
  },
  home: {
    ctaToDisciplines: 'Смотреть работы',
    aboutHeading: 'Обо мне',
    disciplinesHeading: 'Чем я занимаюсь',
  },
  discipline: {
    backHome: 'На главную',
    neighboursHeading: 'Другие направления',
    gallery: {
      empty: 'Пока здесь нет примеров работ — загляните позже.',
      watchVideo: 'Смотреть видео',
    },
  },
  enquiry: {
    heading: 'Оставить заявку',
    fieldName: 'Имя',
    fieldContact: 'Как с вами связаться',
    fieldDate: 'Желаемая дата (необязательно)',
    fieldDescription: 'Опишите задачу',
    fieldDiscipline: 'Направление',
    submit: 'Отправить',
    submitting: 'Отправка…',
    confirmationTitle: 'Заявка получена',
    errorValidation: 'Проверьте, пожалуйста, заполненные поля.',
    errorGeneric: 'Не удалось отправить заявку. Попробуйте ещё раз или напишите напрямую.',
  },
  friends: {
    unadvertisedNotice:
      'Эта страница не защищена паролем — она просто нигде не анонсируется. Если у вас есть ссылка, вы можете её читать.',
  },
  a11y: {
    skipToContent: 'Перейти к содержимому',
  },
} as const

export type CopyKey = typeof ru
