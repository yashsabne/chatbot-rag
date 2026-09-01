# RentSmart Chatbot Widget

A lightweight, dependency-free chat widget that can be embedded on **any**
website with a single `<script>` tag. It provides the floating button, chat
window, and message UI, and talks to an existing chatbot API over HTTP.

This widget contains **no AI logic, no RAG logic, and no API keys**. It is
purely the frontend presentation layer for a chatbot backend you already
have running.

```
Host Website
    ↓
chatbot.js               (creates the UI, handles user interaction)
    ↓
Chatbot UI (Shadow DOM)
    ↓
POST /api/chat            (fetch request with { message })
    ↓
Existing RAG chatbot backend   (already running — not part of this widget)
```

## Folder structure

```
chatbot-widget/
├── chatbot.js     # Widget logic: builds the UI, handles events, calls the API
├── chatbot.css     # Widget styling, scoped entirely under .rsai-widget
└── README.md        # This file
```

## How it works

- `chatbot.js` runs as soon as it's loaded and builds the entire chat UI
  dynamically — the host page does not need any chatbot markup.
- The UI is rendered inside a **Shadow DOM** root, so the host site's CSS
  cannot affect the widget, and the widget's CSS cannot leak out onto the
  host site.
- All chatbot styling lives in `chatbot.css` and is loaded into that Shadow
  DOM automatically (the widget resolves `chatbot.css` relative to wherever
  `chatbot.js` was loaded from, so the two files should stay in the same
  folder together).
- User-generated and API-returned text is inserted using `textContent`
  only — never `innerHTML` — to avoid any XSS risk.

## Embedding it on any website

Copy the `chatbot-widget` folder (or just `chatbot.js` + `chatbot.css`) to
wherever you host static assets, then add one script tag near the end of
your page's `<body>`:

```html
<script
  src="https://your-cdn-or-server.com/chatbot-widget/chatbot.js"
  data-api="http://localhost:5007/api/chat"
  data-title="RentSmart AI"
></script>
```

That's it — no other HTML, CSS, or JS is required on the host page.

## Configuration (via `data-*` attributes)

| Attribute          | Required | Default                          | Description                                                        |
|--------------------|----------|-----------------------------------|----------------------------------------------------------------------|
| `data-api`         | Yes      | —                                 | Full URL of the chatbot API endpoint the widget should POST to.     |
| `data-title`       | No       | `"AI Assistant"`                 | Name shown in the chat window header.                               |
| `data-welcome`     | No       | `"Hi! How can I help you today?"`| Welcome message shown when the chat first opens.                    |
| `data-placeholder` | No       | `"Type your message..."`         | Placeholder text for the input field.                               |
| `data-css`         | No       | auto (`chatbot.css` next to `chatbot.js`) | Override the URL used to load the stylesheet, if needed. |

### Example

```html
<script
  src="./chatbot.js"
  data-api="http://localhost:5007/api/chat"
  data-title="RentSmart AI"
></script>
```

## Deploying to production

Because the API endpoint is fully configurable, moving from local
development to production requires **no code changes** — just update the
`data-api` value:

```html
<script
  src="https://cdn.rentsmart.com/chatbot-widget/chatbot.js"
  data-api="https://my-production-api.com/api/chat"
  data-title="RentSmart AI"
></script>
```

## Expected API contract

The widget expects an existing backend already listening at the URL you
provide via `data-api`. This widget does **not** implement, mock, or
hardcode any of that logic — it only calls it.

**Request** — `POST` to the configured `data-api` URL:

```json
{
  "message": "How do I create an account?"
}
```

**Success response** — `200 OK`:

```json
{
  "answer": "To create an account on RentSmart..."
}
```

The widget renders `response.answer` as the assistant's next chat bubble.

**Error handling**

- Non-2xx HTTP responses, network failures, or a missing/invalid `answer`
  field all result in a friendly in-chat error message (e.g. "Sorry,
  something went wrong while contacting the assistant. Please try again in
  a moment.") — the raw error is never shown to the end user.
- The input field and send button are disabled while a request is in
  flight, and a typing indicator is shown until the response (or error)
  arrives.
- Empty or whitespace-only messages are never sent.

## Security notes

- The widget never stores, references, or transmits any API key or secret.
  Authentication/authorization for the backend, if needed, should be
  handled server-side (e.g. by the backend validating request origin, or
  by putting the widget behind your own authenticated proxy).
- All dynamic content (user input and API responses) is inserted with
  `textContent`, never `innerHTML`, to prevent script injection.
- Styling and DOM are isolated inside a Shadow DOM root
  (`#rentsmart-chatbot-widget-host`), so the widget cannot be
  visually broken by host page CSS, and cannot break the host page's
  styling either.

## What this widget does *not* do

- It does not implement any chatbot intelligence, RAG pipeline, or
  hardcoded answers — all of that lives in your existing backend at
  `data-api`.
- It does not create or modify any backend files.
- It does not depend on React, Vue, Angular, jQuery, Bootstrap, Tailwind,
  or any other external library/framework.
