import axios from "axios";

function parseServerMessages(raw: unknown): string[] {
  if (typeof raw !== "string" || !raw) {
    return [];
  }

  try {
    const entries = JSON.parse(raw) as string[];
    const messages: string[] = [];
    for (const entry of entries) {
      try {
        const parsed = JSON.parse(entry) as { message?: string };
        if (parsed.message) {
          messages.push(parsed.message);
        }
      } catch {
        messages.push(entry);
      }
    }
    return messages;
  } catch {
    return [raw];
  }
}

export function formatFrappeError(error: unknown, prefix: string): string {
  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as Record<string, unknown>;
    const parts: string[] = [prefix];

    if (data.exc_type) {
      parts.push(`(${String(data.exc_type)})`);
    }

    if (typeof data._error_message === "string" && data._error_message) {
      parts.push(data._error_message);
    } else if (typeof data.message === "string" && data.message) {
      parts.push(data.message);
    }

    const serverMessages = parseServerMessages(data._server_messages);
    if (serverMessages.length) {
      parts.push(serverMessages.join("; "));
    }

    if (parts.length === 1 && error.message) {
      parts.push(error.message);
    }

    return parts.join(" ");
  }

  if (error instanceof Error) {
    return `${prefix}: ${error.message}`;
  }

  return prefix;
}

export function isCsrfError(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response?.data) {
    return false;
  }

  const data = error.response.data as Record<string, unknown>;
  return data.exc_type === "CSRFTokenError";
}

export function isAuthError(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return true;
    }

    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data?.exc_type === "AuthenticationError") {
      return true;
    }

    const message = String(data?.message ?? data?._error_message ?? "");
    if (/guest|session expired|not logged|login required|invalid.*sid/i.test(message)) {
      return true;
    }
  }

  if (error instanceof Error) {
    return /session expired|not authenticated|invalid or expired sid|403|401/i.test(
      error.message
    );
  }

  return false;
}

export function isNetworkError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error && /socket hang up|ECONNRESET|ETIMEDOUT/i.test(error.message);
  }

  const code = error.code ?? "";
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ECONNABORTED" ||
    /socket hang up/i.test(error.message)
  );
}

export function parseFrappeMethodResponse(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  const body = data as Record<string, unknown>;
  if ("message" in body && body.message !== undefined && body.message !== null) {
    return body.message;
  }

  return body;
}
