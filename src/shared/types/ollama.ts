export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatOptions {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: {
    role: 'assistant';
    content: string;
  };
  done: boolean;
}

export interface OllamaPullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
  error?: string;
}

export interface OllamaServiceStatus {
  isRunning: boolean;
  port: number;
  version?: string;
  error?: string;
}

export interface OllamaConfig {
  host: string;
  port: number;
  autoStart: boolean;
}
