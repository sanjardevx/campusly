/** The bot's replies in the four UI languages (DECISIONS §3); English is the fallback */
export type BotLang = 'en' | 'uz' | 'ru' | 'ko';

export const botLang = (code?: string | null): BotLang =>
  code === 'uz' || code === 'ru' || code === 'ko' ? code : 'en';

interface BotMessages {
  welcome: string;
  shareButton: string;
  notOwnContact: string;
  phoneNotFound: string;
  linked: (name: string) => string;
  linkInvalid: string;
  notLinked: string;
  resetLink: (url: string, minutes: number) => string;
  resetUnavailable: string;
  tooManyResets: string;
  unlinked: string;
  help: string;
}

export const BOT_MESSAGES: Record<BotLang, BotMessages> = {
  en: {
    welcome:
      'Hello! This bot connects your Campusly account and helps you reset a forgotten password.\n\nParents: tap the button below to share your phone number.\nStudents: open Campusly → account menu → "Connect Telegram".',
    shareButton: '📱 Share my phone number',
    notOwnContact: 'Please share your own phone number with the button below.',
    phoneNotFound:
      'This number is not registered as a parent in Campusly. Please contact the school office.',
    linked: (name) =>
      `Done, ${name}! Your Telegram is connected to Campusly.\nForgot your password? Send /reset.`,
    linkInvalid:
      'This link is expired or was already used. Open Campusly and create a new one.',
    notLinked:
      'Your Telegram is not connected to a Campusly account yet. Send /start to connect it.',
    resetLink: (url, minutes) =>
      `Open this link to set a new password (works once, for ${minutes} minutes):\n${url}\n\nDid not ask for it? Just ignore this message.`,
    resetUnavailable:
      'A password for this account cannot be reset here. Please contact the school office.',
    tooManyResets: 'You asked for too many links. Please try again in an hour.',
    unlinked:
      'Your Telegram is disconnected from Campusly. Send /start to connect it again.',
    help: 'Commands:\n/reset — get a link to set a new password\n/unlink — disconnect this Telegram\n/start — connect your account',
  },
  uz: {
    welcome:
      'Assalomu alaykum! Bu bot Campusly akkauntingizni bog‘laydi va unutilgan parolni tiklashga yordam beradi.\n\nOta-onalar: telefon raqamingizni yuborish uchun pastdagi tugmani bosing.\nO‘quvchilar: Campusly → akkaunt menyusi → «Telegram’ni ulash».',
    shareButton: '📱 Telefon raqamimni yuborish',
    notOwnContact:
      'Iltimos, pastdagi tugma orqali o‘zingizning telefon raqamingizni yuboring.',
    phoneNotFound:
      'Bu raqam Campusly’da ota-ona sifatida ro‘yxatdan o‘tmagan. Maktab ofisiga murojaat qiling.',
    linked: (name) =>
      `Tayyor, ${name}! Telegram’ingiz Campusly’ga ulandi.\nParolni unutdingizmi? /reset yuboring.`,
    linkInvalid:
      'Bu havolaning muddati o‘tgan yoki u ishlatilgan. Campusly’da yangisini oching.',
    notLinked:
      'Telegram’ingiz hali Campusly akkauntiga ulanmagan. Ulash uchun /start yuboring.',
    resetLink: (url, minutes) =>
      `Yangi parol o‘rnatish uchun havolani oching (bir marta, ${minutes} daqiqa ishlaydi):\n${url}\n\nSiz so‘ramaganmisiz? Bu xabarga e’tibor bermang.`,
    resetUnavailable:
      'Bu akkaunt parolini bu yerda tiklab bo‘lmaydi. Maktab ofisiga murojaat qiling.',
    tooManyResets:
      'Juda ko‘p havola so‘raldi. Bir soatdan keyin qayta urinib ko‘ring.',
    unlinked:
      'Telegram’ingiz Campusly’dan uzildi. Qayta ulash uchun /start yuboring.',
    help: 'Buyruqlar:\n/reset — yangi parol uchun havola olish\n/unlink — bu Telegram’ni uzish\n/start — akkauntni ulash',
  },
  ru: {
    welcome:
      'Здравствуйте! Этот бот привязывает ваш аккаунт Campusly и помогает сбросить забытый пароль.\n\nРодители: нажмите кнопку ниже, чтобы отправить свой номер телефона.\nУченики: откройте Campusly → меню аккаунта → «Подключить Telegram».',
    shareButton: '📱 Отправить мой номер',
    notOwnContact: 'Пожалуйста, отправьте свой собственный номер кнопкой ниже.',
    phoneNotFound:
      'Этот номер не зарегистрирован в Campusly как номер родителя. Обратитесь в офис школы.',
    linked: (name) =>
      `Готово, ${name}! Ваш Telegram подключён к Campusly.\nЗабыли пароль? Отправьте /reset.`,
    linkInvalid:
      'Срок действия ссылки истёк или она уже использована. Создайте новую в Campusly.',
    notLinked:
      'Ваш Telegram ещё не подключён к аккаунту Campusly. Отправьте /start, чтобы подключить.',
    resetLink: (url, minutes) =>
      `Откройте ссылку, чтобы задать новый пароль (одноразовая, действует ${minutes} минут):\n${url}\n\nНе запрашивали? Просто проигнорируйте это сообщение.`,
    resetUnavailable:
      'Пароль этого аккаунта нельзя сбросить здесь. Обратитесь в офис школы.',
    tooManyResets: 'Слишком много запросов. Попробуйте через час.',
    unlinked:
      'Ваш Telegram отключён от Campusly. Отправьте /start, чтобы подключить снова.',
    help: 'Команды:\n/reset — ссылка для нового пароля\n/unlink — отключить этот Telegram\n/start — подключить аккаунт',
  },
  ko: {
    welcome:
      '안녕하세요! 이 봇은 Campusly 계정을 연결하고 잊어버린 비밀번호 재설정을 도와줍니다.\n\n보호자: 아래 버튼을 눌러 전화번호를 공유하세요.\n학생: Campusly → 계정 메뉴 → "Telegram 연결"을 여세요.',
    shareButton: '📱 내 전화번호 공유',
    notOwnContact: '아래 버튼으로 본인의 전화번호를 공유해 주세요.',
    phoneNotFound:
      '이 번호는 Campusly에 보호자로 등록되어 있지 않습니다. 학교 사무실에 문의하세요.',
    linked: (name) =>
      `완료되었습니다, ${name}님! Telegram이 Campusly에 연결되었습니다.\n비밀번호를 잊으셨나요? /reset 을 보내세요.`,
    linkInvalid:
      '링크가 만료되었거나 이미 사용되었습니다. Campusly에서 새 링크를 만드세요.',
    notLinked:
      'Telegram이 아직 Campusly 계정에 연결되지 않았습니다. /start 를 보내 연결하세요.',
    resetLink: (url, minutes) =>
      `새 비밀번호를 설정하려면 링크를 여세요 (1회용, ${minutes}분 동안 유효):\n${url}\n\n요청하지 않으셨다면 이 메시지를 무시하세요.`,
    resetUnavailable:
      '이 계정의 비밀번호는 여기에서 재설정할 수 없습니다. 학교 사무실에 문의하세요.',
    tooManyResets: '요청이 너무 많습니다. 1시간 후에 다시 시도하세요.',
    unlinked:
      'Telegram이 Campusly에서 연결 해제되었습니다. 다시 연결하려면 /start 를 보내세요.',
    help: '명령어:\n/reset — 새 비밀번호 링크 받기\n/unlink — 이 Telegram 연결 해제\n/start — 계정 연결',
  },
};
