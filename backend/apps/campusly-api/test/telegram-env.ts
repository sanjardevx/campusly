// Imported FIRST by telegram.e2e-spec.ts: the app reads (and validates) its config when AppModule
// is imported, so the bot must look configured before that. Sending is faked in the test.
process.env.TELEGRAM_BOT_TOKEN = '123456789:e2e-fake-token-e2e-fake-token-e2e';
process.env.TELEGRAM_WEBHOOK_SECRET = 'e2e-webhook-secret-0123456789-abcdef';
process.env.TELEGRAM_BOT_USERNAME = 'campusly_e2e_bot';
