# External AI connections

Plateful separates account-assisted handoffs from automated APIs so users can
choose a familiar service without giving the app unsafe credentials.

| Connection | Mode | Credential in Plateful | Best for |
| --- | --- | --- | --- |
| ChatGPT account | Manual copy/open/import | None | Using an existing Free, Plus, Pro, Business, or Enterprise browser session |
| Arena Direct Chat | Manual copy/open/import | None | Comparing models in a focused direct conversation at arena.ai |
| OpenAI API | Automatic | API key | Structured Responses API output |
| Anthropic API | Automatic | API key | Claude models |
| Google Gemini API | Automatic | API key | Gemini models and Google AI Studio keys |
| OpenRouter | Automatic | API key | Choosing models from multiple providers through one API |
| Ollama | Automatic/local | None | Private local inference |
| LM Studio | Automatic/local | Optional local token | Desktop local models with an OpenAI-compatible server |
| Custom OpenAI-compatible | Automatic | Optional API key | Other hosted or self-hosted endpoints |

## Use a ChatGPT Premium account

1. In **Settings → External AI connections**, add **ChatGPT account** and make
   it the default.
2. Open a video, load or paste its transcript, and choose **AI study studio**.
3. Choose **Complete study pack**, **Clear summary**, **Important points**,
   **Mind map**, or **Practice & quiz**. Review and freely edit the prepared
   prompt.
4. Select **Copy prompt & open ChatGPT**. Plateful never asks for your ChatGPT
   password, cookies, or account token.
5. Paste the request into ChatGPT, copy its JSON response, paste it into
   Plateful, and select **Import & show result**.
6. Plateful validates the summary, key points, commands, mind map, practice, and
   quiz before saving them. Personal notes stay separate until explicitly
   appended.

A ChatGPT subscription does not include OpenAI API usage. To automate this flow,
create a separate OpenAI API key and choose **OpenAI API** instead.

## Use Arena Direct Chat

1. Add **Arena Direct Chat** under **Settings → External AI connections**.
2. In a video’s AI tools, select **Load YouTube transcript**. Plateful fetches
   the current episode’s public caption track server-side; no YouTube copy/paste
   is required.
3. Choose and edit a study prompt, then select **Copy prompt & continue to Arena**.
4. Use Arena’s **Direct Chat** mode for this focused request. Agent mode remains
   useful for complex multi-step follow-up work.
5. Paste Arena’s JSON response back into Plateful and import it.

The handoff copies first and then continues in the same tab so embedded browsers
cannot block it. Use the browser’s Back button to return to the saved workspace.

## API-key handling

Session keys exist only in browser memory and disappear on refresh. They are not
saved in D1, local storage, playlist exports, logs, or notifications. On a
self-hosted server, choose **Use server secret** and configure the matching
environment variable from `.env.example`.

Connection metadata—name, provider, endpoint, model, and credential mode—syncs
with the verified user account across devices. Secrets never sync.
