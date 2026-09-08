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
    fieldEmail: 'Email',
    fieldContact: 'Как с вами связаться',
    fieldDate: 'Желаемая дата (необязательно)',
    fieldDescription: 'Опишите задачу',
    fieldDiscipline: 'Направление',
    submit: 'Отправить',
    submitting: 'Отправка…',
    confirmationTitle: 'Заявка получена',
    signInLink: 'Отслеживать заявку',
    errorValidation: 'Проверьте, пожалуйста, заполненные поля.',
    errorGeneric: 'Не удалось отправить заявку. Попробуйте ещё раз или напишите напрямую.',
  },
  login: {
    heading: 'Вход по коду',
    emailLabel: 'Email',
    emailSubmit: 'Получить код',
    codeLabel: 'Код из письма',
    codeSubmit: 'Войти',
    pending: 'Отправляем код…',
    codeSent: 'Если этот адрес есть в нашей системе, мы отправили код. Проверьте почту.',
    changeAddress: 'Изменить адрес',
    requestNewCode: 'Запросить новый код',
    codeHelpNotArrived: 'Не пришло письмо? Проверьте папку «Спам» или запросите код ещё раз.',
    signOut: 'Выйти',
    signedOut: 'Вы вышли. Чтобы снова увидеть заявки, запросите новый код.',
    sessionEnded: 'Сессия завершена. Войдите снова, чтобы продолжить.',
    errorInvalidEmail: 'Введите корректный email.',
    errorDeliveryFailed: 'Не удалось отправить код на этот адрес. Попробуйте ещё раз позже.',
    errorIncorrectCode: 'Неверный код. Проверьте письмо или запросите новый.',
    errorExpiredCode: 'Срок действия кода истёк. Запросите новый.',
    errorRateLimited: 'Слишком много запросов. Попробуйте снова через {{duration}}.',
    errorLockedOut: 'Слишком много неверных попыток. Попробуйте снова через {{duration}}.',
    emailCodeSubject: 'Код для входа на сайт SanSay',
    emailCodeBody:
      'Ваш код для входа: {{code}}\n\nКод действует {{minutes}} минут.\n\nВойти: {{signInUrl}}\n\nЕсли вы не запрашивали код, просто проигнорируйте это письмо.',
    emailAckSubject: 'Заявка получена — SanSay',
    emailAckBody: 'Спасибо за заявку! Отслеживать её статус можно здесь: {{signInUrl}}',
    emailReplyNoticeSubject: 'Есть ответ на вашу заявку — SanSay',
    emailReplyNoticeBody: 'Владелец ответил на вашу заявку. Прочитать ответ: {{signInUrl}}',
  },
  status: {
    heading: 'Мои заявки',
    emptyTitle: 'Пока нет заявок с этим email',
    emptyBody:
      'Здесь видны только заявки, отправленные с указанным email. Старые заявки без email не отображаются.',
    emptyCta: 'Оставить заявку',
    statusNew: 'Получена',
    statusInProgress: 'В работе',
    statusClosed: 'Закрыта',
    submittedAt: 'Отправлено',
    ownerReplyHeading: 'Ответ',
    backToList: 'К списку заявок',
    notFound: 'Заявка не найдена.',
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
