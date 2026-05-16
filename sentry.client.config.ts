import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,           // Sample 10% of transactions
  debug: false,
  enabled: process.env.NODE_ENV === "production",
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
    /^Loading chunk/,
  ],
  beforeSend(event) {
    // Strip PII from error events
    if (event.user) {
      delete event.user.email;
      delete event.user.username;
    }
    return event;
  },
});
