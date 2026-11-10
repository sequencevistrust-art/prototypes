import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { ProxyAgent } from 'undici';

// Reuse dispatcher to prevent socket exhaustion and connection issues
let proxyDispatcher: any = null;
function getDispatcher() {
  if (!process.env.HTTP_PROXY) return undefined;
  if (!proxyDispatcher) {
     console.log(`[Proxy] Initializing ProxyAgent for ${process.env.HTTP_PROXY}`);
     proxyDispatcher = new ProxyAgent({
        uri: process.env.HTTP_PROXY,
        keepAliveTimeout: 10000,
        keepAliveMaxTimeout: 30000,
     });
  }
  return proxyDispatcher;
}

/**
 * Create a configured Gemini model via the Gemini API (AI Studio key).
 */
export function createModel() {
  const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const dispatcher = getDispatcher();
    if (dispatcher) {
      // @ts-ignore - undici fetch supports dispatcher
      return fetch(input, { ...init, dispatcher });
    }
    return fetch(input, init);
  };

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "No Gemini credentials configured. Set GOOGLE_GENERATIVE_AI_API_KEY (get one at https://aistudio.google.com/apikey)."
    );
  }
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    fetch: customFetch as any,
  });
  return google("gemini-3-flash-preview");
}
