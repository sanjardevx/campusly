import { graphql } from '@/libs/gql';

export const CHANGE_PASSWORD = graphql(`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input) {
      accessToken
    }
  }
`);

/** Students: a one-time t.me link that connects this account to the bot */
export const CREATE_TELEGRAM_LINK = graphql(`
  mutation CreateTelegramLink {
    createTelegramLink {
      url
      expiresAt
    }
  }
`);
