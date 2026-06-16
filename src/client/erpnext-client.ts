import axios, { AxiosInstance } from "axios";
import { AUTH_SETUP_HINT, FALLBACK_DOCTYPES } from "../constants.js";
import { detectAuthMethod } from "../config/credentials.js";
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

  constructor(private readonly logger: Logger) {
    this.baseUrl = process.env.ERPNEXT_URL || "";

    if (!this.baseUrl) {
      throw new Error("ERPNEXT_URL environment variable is required");
    }

    this.baseUrl = this.baseUrl.replace(/\/$/, "");

    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
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
    if (this.authenticated) {
      if (this.authMethod === "api_key") {
        await this.refreshLoggedUser();
      }
      return;
    }

    const username = process.env.ERPNEXT_USERNAME || process.env.ERPNEXT_USER;
    const password = process.env.ERPNEXT_PASSWORD || process.env.ERPNEXT_PWD;
    const sid = process.env.ERPNEXT_SID;
    const cookie = process.env.ERPNEXT_COOKIE;

    if (sid) {
      await this.loginWithSid(sid);
      return;
    }

    if (cookie) {
      this.applyCookieString(cookie);
      await this.refreshCsrfToken();
      this.authenticated = true;
      this.authMethod = "cookie";
      await this.refreshLoggedUser();
      return;
    }

    if (username && password) {
      await this.loginWithCredentials(username, password);
    }
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

  private async refreshCsrfToken(): Promise<void> {
    const envCsrf = process.env.ERPNEXT_CSRF_TOKEN;
    if (envCsrf) {
      this.csrfToken = envCsrf;
      return;
    }

    try {
      const response = await this.axiosInstance.get(
        "/api/method/frappe.sessions.get_csrf_token"
      );
      const token = response.data?.message;
      if (typeof token === "string" && token) {
        this.csrfToken = token;
      }
    } catch {
      // GET requests still work without CSRF; writes may fail until re-login.
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
    this.cookies.sid = sid;
    const envCsrf = process.env.ERPNEXT_CSRF_TOKEN;
    if (envCsrf) {
      this.csrfToken = envCsrf;
    }
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

  async getAuthStatus(): Promise<Record<string, unknown>> {
    if (!this.authenticated) {
      return {
        authenticated: false,
        authMethod: detectAuthMethod(),
        loggedUser: null,
        credentialsFile: this.credentialsFile,
        message: `Not authenticated. ${AUTH_SETUP_HINT}`,
      };
    }

    try {
      await this.refreshLoggedUser();
      return {
        authenticated: true,
        authMethod: this.authMethod,
        loggedUser: this.loggedUser,
        credentialsFile: this.credentialsFile,
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
        message,
      };
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async getDocument(doctype: string, name: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.get(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      );
      return response.data.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get ${doctype} ${name}: ${message}`);
    }
  }

  async getDocList(
    doctype: string,
    filters?: Record<string, unknown>,
    fields?: string[],
    limit?: number
  ): Promise<Record<string, unknown>[]> {
    try {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get ${doctype} list: ${message}`);
    }
  }

  async createDocument(
    doctype: string,
    doc: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.post(
        `/api/resource/${encodeURIComponent(doctype)}`,
        { data: doc }
      );
      return response.data.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create ${doctype}: ${message}`);
    }
  }

  async updateDocument(
    doctype: string,
    name: string,
    doc: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.put(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`,
        { data: doc }
      );
      return response.data.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to update ${doctype} ${name}: ${message}`);
    }
  }

  async runReport(
    reportName: string,
    filters?: Record<string, unknown>
  ): Promise<unknown> {
    try {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to run report ${reportName}: ${message}`);
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
      const response =
        httpMethod === "GET"
          ? await this.axiosInstance.get(`/api/method/${encodedMethod}`, {
              params: args,
            })
          : await this.axiosInstance.post(`/api/method/${encodedMethod}`, args);
      return response.data.message;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to call method ${method}: ${message}`);
    }
  }

  async deleteDocument(doctype: string, name: string): Promise<void> {
    try {
      await this.axiosInstance.delete(
        `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to delete ${doctype} ${name}: ${message}`);
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
