import { graphql } from '@/libs/gql';

/** The public enquiry form (no sign-in; rate limited and honeypot-checked by the server) */
export const SUBMIT_ENQUIRY = graphql(`
  mutation SubmitEnquiry($input: SubmitEnquiryInput!) {
    submitEnquiry(input: $input)
  }
`);
