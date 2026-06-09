/**
 * OPEN MIND AI - Connectors
 * 
 * OAuth integration framework for connecting to various AI providers
 * and external services.
 */

import type { Connector } from '@openmind/shared-types';

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  authorizationUrl: string;
  tokenUrl: string;
  redirectUri: string;
  scopes: string[];
}

export interface APIConnectorConfig {
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
}

export interface WebhookConfig {
  url: string;
  secret?: string;
  events: string[];
}

// Base connector class
export abstract class BaseConnector implements Connector {
  abstract name: string;
  abstract type: 'oauth' | 'api' | 'webhook';
  status: 'connected' | 'disconnected' | 'error' = 'disconnected';
  config: Record<string, unknown> = {};
  protected error?: string;

  abstract connect(): Promise<boolean>;
  abstract disconnect(): Promise<void>;
  abstract healthCheck(): Promise<boolean>;

  getStatus(): Connector['status'] {
    return this.status;
  }

  getError(): string | undefined {
    return this.error;
  }
}

// OAuth Connector
export class OAuthConnector extends BaseConnector {
  type = 'oauth' as const;
  private oauthConfig?: OAuthConfig;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiry?: number;

  constructor(name: string, config: OAuthConfig) {
    super();
    this.name = name;
    this.oauthConfig = config;
    this.config = {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      scopes: config.scopes,
    };
  }

  getAuthorizationUrl(): string {
    if (!this.oauthConfig) throw new Error('OAuth not configured');
    
    const params = new URLSearchParams({
      client_id: this.oauthConfig.clientId,
      redirect_uri: this.oauthConfig.redirectUri,
      response_type: 'code',
      scope: this.oauthConfig.scopes.join(' '),
    });
    
    return `${this.oauthConfig.authorizationUrl}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<boolean> {
    if (!this.oauthConfig) return false;

    try {
      const response = await fetch(this.oauthConfig.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: this.oauthConfig.clientId,
          client_secret: this.oauthConfig.clientSecret || '',
          redirect_uri: this.oauthConfig.redirectUri,
        }),
      });

      if (!response.ok) {
        this.status = 'error';
        this.error = 'Token exchange failed';
        return false;
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.refreshToken = data.refresh_token;
      this.tokenExpiry = Date.now() + (data.expires_in || 3600) * 1000;
      this.status = 'connected';
      return true;
    } catch (err) {
      this.status = 'error';
      this.error = err instanceof Error ? err.message : 'Unknown error';
      return false;
    }
  }

  async connect(): Promise<boolean> {
    // For OAuth, connection requires exchanging an authorization code
    this.status = 'disconnected';
    return false;
  }

  async disconnect(): Promise<void> {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiry = undefined;
    this.status = 'disconnected';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.accessToken || !this.tokenExpiry) return false;
    if (Date.now() >= this.tokenExpiry) {
      this.status = 'disconnected';
      return false;
    }
    return this.status === 'connected';
  }

  getAccessToken(): string | undefined {
    return this.accessToken;
  }
}

// API Connector
export class APIConnector extends BaseConnector {
  type = 'api' as const;
  private apiConfig: APIConnectorConfig;

  constructor(name: string, config: APIConnectorConfig) {
    super();
    this.name = name;
    this.apiConfig = config;
    this.config = {
      baseUrl: config.baseUrl,
    };
  }

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiConfig.baseUrl}/health`, {
        headers: this.getHeaders(),
      });
      
      if (response.ok) {
        this.status = 'connected';
        return true;
      }
      
      this.status = 'error';
      this.error = `Health check failed: ${response.status}`;
      return false;
    } catch (err) {
      this.status = 'error';
      this.error = err instanceof Error ? err.message : 'Connection failed';
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.status = 'disconnected';
  }

  async healthCheck(): Promise<boolean> {
    return this.status === 'connected';
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.apiConfig.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiConfig.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiConfig.apiKey}`;
    }

    return { ...headers, ...this.apiConfig.headers };
  }
}

// Webhook Connector
export class WebhookConnector extends BaseConnector {
  type = 'webhook' as const;
  private webhookConfig: WebhookConfig;

  constructor(name: string, config: WebhookConfig) {
    super();
    this.name = name;
    this.webhookConfig = config;
    this.config = {
      url: config.url,
      events: config.events,
    };
  }

  async connect(): Promise<boolean> {
    // Webhooks don't have a traditional connect flow
    this.status = 'connected';
    return true;
  }

  async disconnect(): Promise<void> {
    this.status = 'disconnected';
  }

  async healthCheck(): Promise<boolean> {
    return this.status === 'connected';
  }

  async send(payload: unknown): Promise<boolean> {
    if (this.status !== 'connected') return false;

    try {
      const body = JSON.stringify(payload);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.webhookConfig.secret) {
        const signature = await this.generateSignature(body);
        headers['X-Webhook-Signature'] = signature;
      }

      const response = await fetch(this.webhookConfig.url, {
        method: 'POST',
        headers,
        body,
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async generateSignature(body: string): Promise<string> {
    if (!this.webhookConfig.secret) return '';
    
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(this.webhookConfig.secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(body)
    );
    
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}

// Factory function
export function createConnector(
  type: 'oauth' | 'api' | 'webhook',
  name: string,
  config: OAuthConfig | APIConnectorConfig | WebhookConfig
): BaseConnector {
  switch (type) {
    case 'oauth':
      return new OAuthConnector(name, config as OAuthConfig);
    case 'api':
      return new APIConnector(name, config as APIConnectorConfig);
    case 'webhook':
      return new WebhookConnector(name, config as WebhookConfig);
    default:
      throw new Error(`Unknown connector type: ${type}`);
  }
}

// Default export
export default {
  OAuthConnector,
  APIConnector,
  WebhookConnector,
  createConnector,
};