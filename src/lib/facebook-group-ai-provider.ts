import "server-only";

import OpenAI from "openai";
import { queryOne } from "./db";
import {
  FACEBOOK_GROUP_AI_MODELS,
  normalizeFacebookGroupAiSettings,
  type FacebookGroupAiProvider,
  type FacebookGroupAiSettings,
} from "./facebook-group-marketing-types";

export type FacebookGroupAiSelection = {
  provider: FacebookGroupAiProvider;
  model: string;
};

export type FacebookGroupAiGeneration<T> = {
  result: T;
  provider: FacebookGroupAiProvider;
  model: string;
  fallbackUsed: boolean;
};

type GenerateOptions = {
  prompt: string;
  settings?: FacebookGroupAiSettings;
  selection?: string | null;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

type ProviderError = Error & {
  provider?: FacebookGroupAiProvider;
  retryable?: boolean;
};

const stripJsonFence = (value: string) =>
  value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

function providerError(
  provider: FacebookGroupAiProvider,
  message: string,
  retryable = true,
): ProviderError {
  const error = new Error(message) as ProviderError;
  error.provider = provider;
  error.retryable = retryable;
  return error;
}

function configured(provider: FacebookGroupAiProvider) {
  return provider === "openai"
    ? Boolean(process.env.OPENAI_API_KEY?.trim())
    : Boolean(process.env.GEMINI_API_KEY?.trim());
}

function modelFor(provider: FacebookGroupAiProvider, settings: FacebookGroupAiSettings) {
  return provider === "openai" ? settings.openaiModel : settings.geminiModel;
}

function parseSelection(
  selection: string | null | undefined,
  settings: FacebookGroupAiSettings,
): FacebookGroupAiSelection {
  const selected = FACEBOOK_GROUP_AI_MODELS.find(item => item.id === selection);
  if (selected) return { provider: selected.provider, model: selected.model };
  return {
    provider: settings.primaryProvider,
    model: modelFor(settings.primaryProvider, settings),
  };
}

async function loadSettings(): Promise<FacebookGroupAiSettings> {
  const row = await queryOne<{ settings: Record<string, unknown> | string }>(
    `SELECT settings FROM facebook_group_settings WHERE id = 'default'`,
  );
  if (!row) return normalizeFacebookGroupAiSettings(undefined);
  const value = typeof row.settings === "string" ? JSON.parse(row.settings) : row.settings;
  return normalizeFacebookGroupAiSettings(value.ai);
}

async function generateWithOpenAi<T>(
  prompt: string,
  model: string,
  options: GenerateOptions,
): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw providerError("openai", "OpenAI chưa được cấu hình trên máy chủ.", false);
  }
  try {
    const client = new OpenAI({
      apiKey,
      timeout: options.timeoutMs || 75_000,
      maxRetries: 1,
    });
    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      max_completion_tokens: options.maxOutputTokens || 4096,
      ...(model.startsWith("gpt-5") ? {} : { temperature: options.temperature ?? 0.25 }),
      messages: [
        {
          role: "system",
          content: "Bạn là AI của CRM SmartFurni. Chỉ trả về một JSON object hợp lệ, không markdown.",
        },
        { role: "user", content: prompt },
      ],
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw providerError("openai", "OpenAI chưa trả về nội dung.", true);
    return JSON.parse(stripJsonFence(content)) as T;
  } catch (cause) {
    if ((cause as ProviderError).provider) throw cause;
    const status = Number((cause as { status?: number }).status || 0);
    if (status === 429) {
      throw providerError("openai", "OpenAI đang hết hạn mức hoặc bị giới hạn tần suất.", true);
    }
    if (status === 401 || status === 403) {
      throw providerError("openai", "OpenAI chưa xác thực được API key hoặc quyền dùng model.", false);
    }
    if (status === 404) {
      throw providerError("openai", `Tài khoản OpenAI chưa được cấp quyền dùng model ${model}.`, true);
    }
    if (cause instanceof SyntaxError) {
      throw providerError("openai", "OpenAI trả về dữ liệu chưa đúng định dạng JSON.", true);
    }
    throw providerError("openai", "OpenAI tạm thời chưa phản hồi. Hệ thống sẽ thử model dự phòng.", true);
  }
}

async function generateWithGemini<T>(
  prompt: string,
  model: string,
  options: GenerateOptions,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw providerError("gemini", "Gemini chưa được cấu hình trên máy chủ.", false);
  }
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.25,
            maxOutputTokens: options.maxOutputTokens || 4096,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(options.timeoutMs || 75_000),
      },
    );
  } catch {
    throw providerError("gemini", "Gemini tạm thời chưa phản hồi. Hệ thống sẽ thử model dự phòng.", true);
  }
  const payload = await response.json().catch(() => ({})) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  if (!response.ok) {
    if (response.status === 429) {
      throw providerError("gemini", "Gemini đã hết quota hoặc đang bị giới hạn tần suất.", true);
    }
    if (response.status === 401 || response.status === 403) {
      throw providerError("gemini", "Gemini chưa xác thực được API key hoặc quyền dùng model.", false);
    }
    if (response.status === 404) {
      throw providerError("gemini", `Tài khoản Gemini chưa được cấp quyền dùng model ${model}.`, true);
    }
    throw providerError("gemini", "Gemini tạm thời chưa tạo được nội dung.", true);
  }
  const raw = payload.candidates?.[0]?.content?.parts?.map(part => part.text || "").join("") || "";
  if (!raw) throw providerError("gemini", "Gemini chưa trả về nội dung.", true);
  try {
    return JSON.parse(stripJsonFence(raw)) as T;
  } catch {
    throw providerError("gemini", "Gemini trả về dữ liệu chưa đúng định dạng JSON.", true);
  }
}

async function runProvider<T>(
  selection: FacebookGroupAiSelection,
  options: GenerateOptions,
): Promise<T> {
  return selection.provider === "openai"
    ? generateWithOpenAi<T>(options.prompt, selection.model, options)
    : generateWithGemini<T>(options.prompt, selection.model, options);
}

export async function generateFacebookGroupAiJson<T>(
  options: GenerateOptions,
): Promise<FacebookGroupAiGeneration<T>> {
  const settings = normalizeFacebookGroupAiSettings(options.settings || await loadSettings());
  const primary = parseSelection(options.selection, settings);
  try {
    return {
      result: await runProvider<T>(primary, options),
      ...primary,
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const fallbackProvider = primary.provider === settings.fallbackProvider
      ? settings.primaryProvider : settings.fallbackProvider;
    const fallback = {
      provider: fallbackProvider,
      model: modelFor(fallbackProvider, settings),
    };
    if (
      !settings.autoFallback
      || fallback.provider === primary.provider
      || !configured(fallback.provider)
    ) {
      throw primaryError;
    }
    try {
      return {
        result: await runProvider<T>(fallback, options),
        ...fallback,
        fallbackUsed: true,
      };
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : "Model chính gặp lỗi.";
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "Model dự phòng gặp lỗi.";
      throw new Error(`${primaryMessage} ${fallbackMessage}`);
    }
  }
}

export async function getFacebookGroupAiModelCatalog() {
  const settings = await loadSettings();
  return {
    configured: {
      openai: configured("openai"),
      gemini: configured("gemini"),
    },
    defaultSelection: `${settings.primaryProvider}:${modelFor(settings.primaryProvider, settings)}`,
    settings,
    models: FACEBOOK_GROUP_AI_MODELS.map(item => ({
      ...item,
      configured: configured(item.provider),
    })),
  };
}
