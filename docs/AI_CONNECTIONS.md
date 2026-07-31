# External AI connections

Plateful separates account-assisted handoffs from automated APIs so users can
choose a familiar service without giving the app unsafe credentials.

| Connection | Mode | Credential in Plateful | Best for |
| --- | --- | --- | --- |
| ChatGPT account | Manual copy/open/import | None | Using an existing Free, Plus, Pro, Business, or Enterprise browser session |
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
3. Copy the structured request and open ChatGPT. Plateful never asks for your
   ChatGPT password, cookies, or account token.
4. Paste the request into ChatGPT, copy its JSON response, paste it into
   Plateful, and select **Import study pack**.
5. Plateful validates the summary, key points, commands, mind map, practice, and
   quiz before saving them. Personal notes stay separate until explicitly
   appended.

A ChatGPT subscription does not include OpenAI API usage. To automate this flow,
create a separate OpenAI API key and choose **OpenAI API** instead.

## API-key handling

Session keys exist only in browser memory and disappear on refresh. They are not
saved in D1, local storage, playlist exports, logs, or notifications. On a
self-hosted server, choose **Use server secret** and configure the matching
environment variable from `.env.example`.

Connection metadata—name, provider, endpoint, model, and credential mode—syncs
with the verified user account across devices. Secrets never sync.
