import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createVertex } from "@ai-sdk/google-vertex";
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
 * Create a configured Gemini model.
 * Prefers Vertex AI if credentials are available, falls back to AI Studio.
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

  // Prefer Vertex AI if credentials are available
  if (
    process.env.GOOGLE_VERTEX_PROJECT &&
    process.env.GOOGLE_CLIENT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  ) {
    const vertex = createVertex({
      project: process.env.GOOGLE_VERTEX_PROJECT,
      location: process.env.GOOGLE_VERTEX_LOCATION,
      googleAuthOptions: {
        credentials: {
          client_email: process.env.GOOGLE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY,
        },
      },
      fetch: customFetch,
    });
    return vertex("gemini-3-flash-preview");
  }

  // Fall back to AI Studio
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error(
      "No Gemini credentials configured. Set either Vertex AI credentials (GOOGLE_VERTEX_PROJECT, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) or GOOGLE_GENERATIVE_AI_API_KEY."
    );
  }
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    fetch: customFetch as any,
  });
  return google("gemini-3-flash-preview");
}
