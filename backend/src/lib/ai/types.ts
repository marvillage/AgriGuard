export interface AiImage {
  mimeType: string;
  base64: string;
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  images?: AiImage[];
}

export interface AiRequest {
  system?: string;
  messages: AiMessage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AiResult {
  text: string;
  provider: string;
  model: string;
  cached?: boolean;
}

export interface AiProvider {
  name: string;
  configured(): boolean;
  pickModel(vision: boolean): Promise<string | null>;
  generate(request: AiRequest, model: string): Promise<string>;
}
