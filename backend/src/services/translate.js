// Translation service: uses Google Cloud Translate if configured; otherwise returns original text.

let googleClient = null;

async function getGoogleClient() {
  if (googleClient) return googleClient;
  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
  if (!projectId) return null;

  try {
    const mod = await import('@google-cloud/translate');
    const { Translate } = mod;
    googleClient = new Translate({ projectId });
    return googleClient;
  } catch {
    return null;
  }
}

export async function translateText(text, to) {
  if (!text || !to || to === 'ka') return text;

  const client = await getGoogleClient();
  if (!client) return text;

  const [translated] = await client.translate(text, to);
  return Array.isArray(translated) ? translated.join('\n') : translated;
}
