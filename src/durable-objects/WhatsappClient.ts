import whatsapp from "whatsapp-web.js";

// Types for WhatsApp client operations
export type WhatsAppResult<T = any> =
  | { status: "ready"; data: T }
  | { status: "waiting_for_qr"; qr: string }
  | { status: "error"; error: string };

type ClientStatus =
  | { status: "initializing" }
  | { status: "ready"; client: whatsapp.Client }
  | { status: "waiting_for_qr"; qr: string }
  | { status: "error"; error: string };

// WhatsApp Durable Object - Singleton Pattern
export class WhatsAppClient {
  private static instance: WhatsAppClient | null = null;
  private clientStatus: ClientStatus = { status: "initializing" };

  private constructor() {
    console.log("WhatsApp DO: Constructor");
    // Start initialization without awaiting
    this.initializeClient();
  }

  // Static method to get singleton instance
  public static getInstance(): WhatsAppClient {
    if (!WhatsAppClient.instance) {
      WhatsAppClient.instance = new WhatsAppClient();
    }
    return WhatsAppClient.instance;
  }

  // Static method to reset instance (useful for testing or reinitialization)
  public static resetInstance(): void {
    WhatsAppClient.instance = null;
  }

  // Higher order function that handles client operations with status management
  private withClient<T extends (...args: any[]) => any>(
    operation: (client: whatsapp.Client) => T
  ): (
    ...args: Parameters<T>
  ) => Promise<WhatsAppResult<Awaited<ReturnType<T>>>> {
    return async (...args: Parameters<T>) => {
      // Wait for initialization to complete with timeout
      console.log("WhatsApp DO: Waiting for status change");
      await this.waitForStatusChange();
      console.log("WhatsApp DO: Status change complete");

      switch (this.clientStatus.status) {
        case "ready":
          try {
            const result = await operation(this.clientStatus.client)(...args);
            return { status: "ready", data: result };
          } catch (error) {
            return {
              status: "error",
              error:
                error instanceof Error ? error.message : "Operation failed",
            };
          }
        case "waiting_for_qr":
          return { status: "waiting_for_qr", qr: this.clientStatus.qr };
        case "error":
          return { status: "error", error: this.clientStatus.error };
        default:
          return { status: "error", error: "Client in unknown state" };
      }
    };
  }

  // Wait for status to change from 'initializing' with timeout
  private async waitForStatusChange(): Promise<void> {
    const MAX_WAIT_TIME = 120000; // 30 seconds
    const CHECK_INTERVAL = 500; // 500ms
    const startTime = Date.now();

    while (
      this.clientStatus.status === "initializing" &&
      Date.now() - startTime < MAX_WAIT_TIME
    ) {
      await new Promise((resolve) => setTimeout(resolve, CHECK_INTERVAL));
    }

    if (this.clientStatus.status === "initializing") {
      this.clientStatus = {
        status: "error",
        error: "Initialization timeout after 30 seconds",
      };
    }
  }

  // Public RPC method for getting unread count
  getUnreadCount = this.withClient((client) => async () => {
    console.log("WhatsApp DO: Getting chats");
    const chats = await client.getChats();
    const unreadCount = chats.filter(
      (chat) => chat.unreadCount > 0
    ).length;

    return {
      unreadCount,
      totalChats: chats.length,
    };
  });

  getChats = this.withClient((client) => async () => {
    console.log("WhatsApp DO: Getting chats");
    const chats = await client.getChats();
    return chats;
  });

  private async initializeClient(): Promise<void> {
    try {
      const authStrategy = new whatsapp.LocalAuth();

      const client = new whatsapp.Client({
        authStrategy,
      });

      // Set up event handlers
      client.on("qr", async (qr: string) => {
        console.log("WhatsApp DO: QR RECEIVED");
        this.clientStatus = { status: "waiting_for_qr", qr };
      });

      client.on("ready", async () => {
        console.log("WhatsApp DO: Client is ready!");
        this.clientStatus = { status: "ready", client };
      });

      client.on("authenticated", async () => {
        console.log("WhatsApp DO: Client authenticated!");
        this.clientStatus = { status: "ready", client };
      });

      client.on("auth_failure", async (msg: string) => {
        console.error("WhatsApp DO: Authentication failed:", msg);
        this.clientStatus = {
          status: "error",
          error: `Authentication failed: ${msg}`,
        };
      });

      client.on("disconnected", async (reason: string) => {
        console.log("WhatsApp DO: Client disconnected:", reason);
        this.clientStatus = {
          status: "error",
          error: `Client disconnected: ${reason}`,
        };
      });

      console.log("WhatsApp DO: Initializing client");
      await client.initialize();
    } catch (error) {
      console.error("WhatsApp DO: Client initialization failed:", error);
      this.clientStatus = {
        status: "error",
        error: error instanceof Error ? error.message : "Initialization failed",
      };
    }
  }
}
