import { readFile } from "node:fs/promises";
import axios, { AxiosInstance } from "axios";
import { AUTH_SETUP_HINT, FALLBACK_DOCTYPES } from "../constants.js";
import { detectAuthMethod, loadCredentialsIntoEnv } from "../config/credentials.js";
import {
  ERPNEXT_URL_MCP_ENV,
  ERPNEXT_URL_SETUP_HINT,
  resolveErpnextUrlFromProcessEnv,
  normalizeErpnextUrl,
} from "../config/erpnext-url.js";
import { resolveCsrfToken } from "./csrf.js";
import { formatFrappeError, isAuthError, isCsrfError, isNetworkError, parseFrappeMethodResponse } from "./frappe-errors.js";
import type { Logger } from "../utils/logger.js";

export class ERPNextClient {
  private baseUrl: string;
  private axiosInstance: AxiosInstance;
  private authenticated = false;
  private cookies: Record<string, string> = {};
  private csrfToken = "";
  private authMethod = "none";
  private loggedUser = "";
  private credentialsFile: string | null = null;
  private lastAuthError: string | null = null;

  constructor(private readonly logger: Logger, baseUrl?: string) {
    const resolved = baseUrl
      ? normalizeErpnextUrl(baseUrl)
      : resolveErpnextUrlFromProcessEnv();

    if (!resolved) {
      throw new Error(ERPNEXT_URL_SETUP_HINT);
    }

    this.baseUrl = resolved;

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      timeout: 120_000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    this.axiosInstance.interceptors.request.use((config) => {
      const cookieHeader = this.getCookieHeader();
      if (cookieHeader) {
        config.headers.set("Cookie", cookieHeader);
      }
      if (
        this.csrfToken &&
        config.method &&
        config.method.toLowerCase() !== "get"
      ) {
        config.headers.set("X-Frappe-CSRF-Token", this.csrfToken);
      }
      return config;
    });

    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;
    const placeholderKeys = new Set(["your-api-key", "your_api_key", ""]);

    if (apiKey && apiSecret && !placeholderKeys.has(apiKey)) {
      this.axiosInstance.defaults.headers.common["Authorization"] =
        `token ${apiKey}:${apiSecret}`;
      this.authenticated = true;
      this.authMethod = "api_key";
    }
  }

  setCredentialsFile(path: string | null): void {
    this.credentialsFile = path;
  }

  async initializeAuth(): Promise<void> {
    this.lastAuthError = null;

    if (this.authenticated && this.authMethod === "api_key") {
      return;
    }

    const username = process.env.ERPNEXT_USERNAME || process.env.ERPNEXT_USER;
    const password = process.env.ERPNEXT_PASSWORD || process.env.ERPNEXT_PWD;
    const sid = process.env.ERPNEXT_SID;
    const cookie = process.env.ERPNEXT_COOKIE;

    if (sid) {
      this.applySidSession(sid);
      this.authenticated = true;
      await this.loadCachedSessionHint();
      return;
    }

    if (cookie) {
      this.applyCookieString(cookie);
      await this.refreshCsrfToken();
      this.authenticated = true;
      this.authMethod = "cookie";
      await this.loadCachedSessionHint();
      return;
    }

    if (username && password) {
      try {
        await this.loginWithCredentials(username, password);
      } catch (error: unknown) {
        this.recordAuthFailure("password", error);
      }
    }
  }

  async authenticateWithSid(sid: string, csrfToken = ""): Promise<string> {
    this.applySidSession(sid);
    if (csrfToken) {
      this.csrfToken = csrfToken;
    }
    await this.refreshCsrfToken(!csrfToken);
    await this.refreshLoggedUser();
    this.authenticated = true;
    return this.loggedUser;
  }

  private applySidSession(sid: string): void {
    this.cookies.sid = sid;
    this.authMethod = "sid";
    const envCsrf = process.env.ERPNEXT_CSRF_TOKEN;
    if (envCsrf) {
      this.csrfToken = envCsrf;
    }
  }

  private async loadCachedSessionHint(): Promise<void> {
    const path = this.credentialsFile;
    if (!path) {
      return;
    }

    try {
      const raw = await readFile(path, "utf8");
      const data = JSON.parse(raw) as {
        _meta?: { loggedUser?: string };
      };
      if (data._meta?.loggedUser) {
        this.loggedUser = data._meta.loggedUser;
      }
    } catch {
      // optional hint only
    }
  }

  async reloadSessionFromDisk(): Promise<boolean> {
    await loadCredentialsIntoEnv({ refreshSession: true });

    const sid = process.env.ERPNEXT_SID;
    if (sid) {
      this.applySidSession(sid);
    }

    const cookie = process.env.ERPNEXT_COOKIE;
    if (cookie) {
      this.applyCookieString(cookie);
      this.authMethod = "cookie";
    }

    delete process.env.ERPNEXT_CSRF_TOKEN;
    this.csrfToken = "";
    await this.refreshCsrfToken(true);

    try {
      await this.refreshLoggedUser();
      this.authenticated = true;
      return true;
    } catch {
      this.authenticated = false;
      this.loggedUser = "";
      return false;
    }
  }

  private recordAuthFailure(method: string, error: unknown): void {
    this.authenticated = false;
    this.authMethod = method;
    this.loggedUser = "";
    const detail = error instanceof Error ? error.message : String(error);
    this.lastAuthError =
      method === "sid" && !detail.includes(AUTH_SETUP_HINT)
        ? `Invalid or expired sid cookie: ${detail}. ${AUTH_SETUP_HINT}`
        : detail;
    this.logger.warn(`ERPNext auth failed (${method}): ${this.lastAuthError}`);
  }

  private getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private mergeSetCookies(setCookie: string[] | undefined): void {
    if (!setCookie) {
      return;
    }
    for (const header of setCookie) {
      const pair = header.split(";")[0];
      const eq = pair.indexOf("=");
      if (eq > 0) {
        this.cookies[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
      }
    }
  }

  private applyCookieString(cookie: string): void {
    for (const part of cookie.split(";")) {
      const trimmed = part.trim();
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        this.cookies[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
      }
    }
  }

  private async refreshCsrfToken(force = false): Promise<void> {
    if (!force) {
      const envCsrf = process.env.ERPNEXT_CSRF_TOKEN;
      if (envCsrf) {
        this.csrfToken = envCsrf;
        return;
      }
    }

    const token = await resolveCsrfToken(
      this.axiosInstance,
      force ? undefined : process.env.ERPNEXT_CSRF_TOKEN
    );
    if (token) {
      this.csrfToken = token;
    }
  }

  private async ensureWriteAuth(forceCsrf = false): Promise<void> {
    const token = await resolveCsrfToken(
      this.axiosInstance,
      forceCsrf ? undefined : process.env.ERPNEXT_CSRF_TOKEN
    );
    if (token) {
      this.csrfToken = token;
    } else if (!this.csrfToken) {
      throw new Error(
        `Could not resolve CSRF token for write operations. ${AUTH_SETUP_HINT}`
      );
    }
  }

  private async withRequestRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error: unknown) {
      if (isNetworkError(error)) {
        this.logger.warn("ERPNext network error — retrying once");
        await this.delay(1500);
        return await fn();
      }

      if (!isAuthError(error)) {
        throw error;
      }

      this.logger.warn("ERPNext auth error — reloading session from credentials file");
      const reloaded = await this.reloadSessionFromDisk();
      if (!reloaded) {
        throw new Error(`Session expired. ${AUTH_SETUP_HINT}`);
      }

      return await fn();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async withWriteRetry<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureWriteAuth();
    try {
      return await fn();
    } catch (error: unknown) {
      if (isNetworkError(error)) {
        this.logger.warn("ERPNext write network error — retrying once");
        await this.delay(1500);
        await this.ensureWriteAuth(true);
        return await fn();
      }

      if (isCsrfError(error)) {
        delete process.env.ERPNEXT_CSRF_TOKEN;
        this.csrfToken = "";
        await this.ensureWriteAuth(true);
        return await fn();
      }

      if (isAuthError(error)) {
        this.logger.warn("ERPNext write auth error — reloading session");
        const reloaded = await this.reloadSessionFromDisk();
        if (!reloaded) {
          throw new Error(`Session expired. ${AUTH_SETUP_HINT}`);
        }
        await this.ensureWriteAuth(true);
        return await fn();
      }

      throw error;
    }
  }

  async loginWithCredentials(username: string, password: string): Promise<void> {
    const response = await this.axiosInstance.post("/api/method/login", {
      usr: username,
      pwd: password,
    });

    if (
      response.data?.message !== "Logged In" &&
      response.data?.message !== "No App"
    ) {
      throw new Error(
        `Login failed: ${response.data?.message || "unexpected response"}`
      );
    }

    this.mergeSetCookies(response.headers["set-cookie"]);
    await this.refreshCsrfToken();
    this.authenticated = true;
    this.authMethod = "password";
    await this.refreshLoggedUser();
  }

  async loginWithSid(sid: string): Promise<void> {
    this.applySidSession(sid);
    await this.refreshCsrfToken();

    try {
      await this.refreshLoggedUser();
      this.authenticated = true;
      this.authMethod = "sid";
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "session check failed";
      throw new Error(
        `Invalid or expired sid cookie: ${message}. ${AUTH_SETUP_HINT}`
      );
    }
  }

  private async refreshLoggedUser(): Promise<void> {
    const response = await this.axiosInstance.get(
      "/api/method/frappe.auth.get_logged_user"
    );
    const user = response.data?.message;
    if (!user || user === "Guest") {
      throw new Error(`Session is not authenticated. ${AUTH_SETUP_HINT}`);
    }
    this.loggedUser = user;
  }

  async getAuthStatus(
    options: { verify?: boolean } = {}
  ): Promise<Record<string, unknown>> {
    const verify = options.verify === true;

    if (!this.authenticated) {
      return {
        authenticated: false,
        authMethod: this.authMethod !== "none" ? this.authMethod : detectAuthMethod(),
        loggedUser: null,
        credentialsFile: this.credentialsFile,
        verified: false,
        message:
          this.lastAuthError ?? `Not authenticated. ${AUTH_SETUP_HINT}`,
      };
    }

    if (!verify) {
      return {
        authenticated: true,
        authMethod: this.authMethod,
        loggedUser: this.loggedUser || null,
        credentialsFile: this.credentialsFile,
        verified: false,
        message:
          "Session configured (lazy mode — not verified until check_auth with verify or on API error).",
      };
    }

    try {
      await this.refreshLoggedUser();
      return {
        authenticated: true,
        authMethod: this.authMethod,
        loggedUser: this.loggedUser,
        credentialsFile: this.credentialsFile,
        verified: true,
        message: "Session is valid.",
      };
    } catch (error: unknown) {
      this.authenticated = false;
      const message =
        error instanceof Error
          ? error.message
          : `Session expired. ${AUTH_SETUP_HINT}`;
      return {
        authenticated: false,
        authMethod: this.authMethod,
        loggedUser: null,
        credentialsFile: this.credentialsFile,
        verified: true,
        message,
      };
    }
  }

  hasCredentialsConfigured(): boolean {
    return (
      this.authenticated ||
      detectAuthMethod() !== "none" ||
      Boolean(
        (process.env[ERPNEXT_URL_MCP_ENV] || process.env.ERPNEXT_URL) &&
          process.env.ERPNEXT_SID
      )
    );
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getLoggedUser(): string {
    return this.loggedUser;
  }

  async getDocument(doctype: string, name: string): Promise<Record<string, unknown>> {
    try {
      return await this.withRequestRetry(async () => {
        const response = await this.axiosInstance.get(
          `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
        );
        return response.data.data;
      });
    } catch (error: unknown) {
      throw new Error(
        formatFrappeError(error, `Failed to get ${doctype} ${name}`)
      );
    }
  }

  async getDocList(
    doctype: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    try {
      return await this.withRequestRetry(async () => {
        const params: Record<string, unknown> = {};

        if (fields?.length) {
          params.fields = JSON.stringify(fields);
        }
        if (filters) {
          params.filters = JSON.stringify(filters);
        }
        if (limit) {
          params.limit_page_length = limit;
        }

        const response = await this.axiosInstance.get(
          `/api/resource/${encodeURIComponent(doctype)}`,
          { params }
        );
        return response.data.data;
      });
    } catch (error: unknown) {
      throw new Error(formatFrappeError(error, `Failed to get ${doctype} list`));
    }
  }

  async createDocument(
    doctype: string,
    doc: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      return await this.withWriteRetry(async () => {
        const response = await this.axiosInstance.post(
          `/api/resource/${encodeURIComponent(doctype)}`,
          { data: doc }
        );
        return response.data.data;
      });
    } catch (error: unknown) {
      throw new Error(formatFrappeError(error, `Failed to create ${doctype}`));
    }
  }

  async updateDocument(
    doctype: string,
    name: string,
    doc: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      return await this.withWriteRetry(async () => {
        const response = await this.axiosInstance.put(
          `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
          { data: doc }
        );
        return response.data.data;
      });
    } catch (error: unknown) {
      throw new Error(
        formatFrappeError(error, `Failed to update ${doctype} ${name}`)
      );
    }
  }

  async runReport(
    reportName: string,
    filters?: Record<string, unknown>
  ): Promise<unknown> {
    try {
      return await this.withRequestRetry(async () => {
        const response = await this.axiosInstance.get(
          "/api/method/frappe.desk.query_report.run",
          {
            params: {
              report_name: reportName,
              filters: filters ? JSON.stringify(filters) : undefined,
            },
          }
        );
        return response.data.message;
      });
    } catch (error: unknown) {
      throw new Error(
        formatFrappeError(error, `Failed to run report ${reportName}`)
      );
    }
  }

  async callMethod(
    method: string,
    args?: Record<string, unknown>,
    httpMethod: "GET" | "POST" = "POST"
  ): Promise<unknown> {
    try {
      const encodedMethod = method
        .split(".")
        .map(encodeURIComponent)
        .join(".");
      if (httpMethod === "GET") {
        return await this.withRequestRetry(async () => {
          const response = await this.axiosInstance.get(
            `/api/method/${encodedMethod}`,
            { params: args }
          );
          return parseFrappeMethodResponse(response.data);
        });
      }

      return await this.withWriteRetry(async () => {
        const response = await this.axiosInstance.post(
          `/api/method/${encodedMethod}`,
          args ?? {}
        );
        return parseFrappeMethodResponse(response.data);
      });
    } catch (error: unknown) {
      throw new Error(formatFrappeError(error, `Failed to call method ${method}`));
    }
  }

  async addDocumentComment(params: {
    reference_doctype: string;
    reference_name: string;
    content: string;
    comment_email: string;
    comment_by: string;
  }): Promise<Record<string, unknown>> {
    const {
      reference_doctype: referenceDoctype,
      reference_name: referenceName,
      content,
      comment_email: commentEmail,
      comment_by: commentBy,
    } = params;

    if (!referenceDoctype || !referenceName || !content?.trim()) {
      throw new Error(
        "reference_doctype, reference_name, and content are required for add_document_comment"
      );
    }

    if (!commentEmail || !commentBy) {
      throw new Error("comment_email and comment_by are required for add_document_comment");
    }

    try {
      await this.getDocument(referenceDoctype, referenceName);
    } catch (error: unknown) {
      throw new Error(
        formatFrappeError(
          error,
          `${referenceDoctype} ${referenceName} not found or not accessible`
        )
      );
    }

    try {
      const result = await this.callMethod("frappe.desk.form.utils.add_comment", {
        reference_doctype: referenceDoctype,
        reference_name: referenceName,
        content,
        comment_email: commentEmail,
        comment_by: commentBy,
      });

      if (result && typeof result === "object") {
        return result as Record<string, unknown>;
      }

      throw new Error("add_comment returned an empty response");
    } catch (error: unknown) {
      throw new Error(formatFrappeError(error, "Failed to add document comment"));
    }
  }

  async deleteDocument(doctype: string, name: string): Promise<void> {
    try {
      await this.withWriteRetry(async () => {
        await this.axiosInstance.delete(
          `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
        );
      });
    } catch (error: unknown) {
      throw new Error(
        formatFrappeError(error, `Failed to delete ${doctype} ${name}`)
      );
    }
  }

  async getAllDocTypes(): Promise<string[]> {
    try {
      const response = await this.axiosInstance.get("/api/resource/DocType", {
        params: {
          fields: JSON.stringify(["name"]),
          limit_page_length: 500,
        },
      });

      if (response.data?.data) {
        return response.data.data.map((item: { name: string }) => item.name);
      }

      return [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error("Failed to get DocTypes:", message);

      try {
        const altResponse = await this.axiosInstance.get(
          "/api/method/frappe.desk.search.search_link",
          {
            params: {
              doctype: "DocType",
              txt: "",
              limit: 500,
            },
          }
        );

        if (altResponse.data?.results) {
          return altResponse.data.results.map(
            (item: { value: string }) => item.value
          );
        }

        return [];
      } catch (altError: unknown) {
        const altMessage =
          altError instanceof Error ? altError.message : "Unknown error";
        this.logger.error("Alternative DocType fetch failed:", altMessage);
        return [...FALLBACK_DOCTYPES];
      }
    }
  }
}
