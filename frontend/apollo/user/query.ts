import { graphql } from '@/libs/gql';

export const ME = graphql(`
  query Me {
    me {
      id
      loginId
      role
      firstName
      lastName
      locale
      mustChangePassword
    }
  }
`);

/** A parent's children, for the child switcher in the top bar */
export const MY_CHILDREN = graphql(`
  query MyChildren {
    myChildren {
      id
      loginId
      firstName
      lastName
      className
    }
  }
`);

/** "Connect Telegram" page: is the bot set up, is this account connected */
export const TELEGRAM_STATUS = graphql(`
  query TelegramStatus {
    telegramStatus {
      enabled
      linked
      botUsername
    }
  }
`);
