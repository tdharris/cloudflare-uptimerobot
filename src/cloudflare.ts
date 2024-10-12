// deno-lint-ignore-file no-explicit-any
import { sleep } from "./util.ts";

import {
  CloudflareOptions,
  CreateAccountListOptions,
  CreateFirewallRuleOptions,
} from "./types.ts";

const CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4";

export class Cloudflare {
  private apiKey = "";
  private domain = "";
  private account = "";
  private zoneId = "";
  private accountId = "";

  constructor({
    apiKey,
    domain,
    account,
  }: CloudflareOptions) {
    if (!apiKey) {
      throw new Error("apiKey is required");
    }
    if (!domain) {
      throw new Error("domain is required");
    }
    if (!account) {
      throw new Error("account is required");
    }

    this.apiKey = apiKey;
    this.domain = domain;
    this.account = account;
  }

  private async validateApiKey() {
    const check = await this.get("/user/tokens/verify");
    if (!check.success) {
      throw new Error("Invalid API key");
    }
    console.log("INFO: ✓ API key is valid");
  }

  public async initialize() {
    // Validate the API key
    await this.validateApiKey();

    // Set accountId
    const accountId = await this.setAccountIdByName(this.account);
    if (!accountId) {
      throw new Error("Could not find accountId for account " + this.account);
    }
    console.log(
      "INFO: ✓ AccountId for account " + this.account + " is " + accountId,
    );

    // Set zoneId
    const zoneId = await this.setZoneIdByDomainName(this.domain);
    if (!zoneId) {
      throw new Error("Could not find zoneId for domain " + this.domain);
    }
    console.log("INFO: ✓ Zone ID for domain " + this.domain + " is " + zoneId);
  }

  // Accounts
  // Lists: Manage Account > Configurations > Lists
  private async setAccountIdByName(name: string) {
    const r = await this.get("/accounts?name=" + name);
    if (!r.success) {
      console.error(r);
      throw new Error("Could not find accountId for account " + name);
    }
    this.accountId = r.result[0].id;
    return r.result[0].id;
  }

  public async getAccountLists() {
    const r = await this.get("/accounts/" + this.accountId + "/rules/lists");
    if (!r.success) {
      console.error(r);
      throw new Error("Could not get account lists.");
    }
    return r.result;
  }

  public async getAccountList(listId: string) {
    const r = await this.get(
      "/accounts/" + this.accountId + "/rules/lists/" + listId,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not get account list.");
    }
    return r.result;
  }

  public async createAccountList({
    name,
    kind,
    description,
  }: CreateAccountListOptions) {
    const r = await this.post("/accounts/" + this.accountId + "/rules/lists", {
      name,
      kind,
      description,
    });
    if (!r.success) {
      console.error(r);
      throw new Error("Could not create account list.");
    }
    return r.result;
  }

  public async deleteAccountList(listId: string) {
    const r = await this.delete(
      "/accounts/" + this.accountId + "/rules/lists/" + listId,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not delete account list.");
    }
    return r.result;
  }

  public async getListItems(listId: string) {
    // Keep fetching and appending until cursor is undefined
    let items: any[] = [],
      cursorExists = true,
      cursor;
    while (cursorExists) {
      const r = await this.get(
        "/accounts/" + this.accountId + "/rules/lists/" + listId + "/items" +
          (cursor ? "?cursor=" + cursor : ""),
      );
      if (!r.success) {
        console.error(r);
        throw new Error("Could not get list items.");
      }
      items = items.concat(r.result);
      cursorExists = r.result_info.cursors.after ? true : false;
      if (cursorExists) {
        cursor = r.result_info.cursors.after;
      }
    }

    return items;
  }

  public async createListItems(
    listId: string,
    items: { ip: string }[],
  ) {
    const r = await this.post(
      "/accounts/" + this.accountId + "/rules/lists/" + listId + "/items",
      items,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not create list items.");
    }
    return r.result;
  }

  public async updateAllListItems(
    listId: string,
    items: { ip: string; comment?: string }[],
  ) {
    const r = await this.put(
      "/accounts/" + this.accountId + "/rules/lists/" + listId + "/items",
      items,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not update all list items.");
    }
    return r.result;
  }

  public async getBulkOperationStatus(operationId: string) {
    const r = await this.get(
      "/accounts/" + this.accountId + "/rules/lists/bulk_operations/" +
        operationId,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not get bulk operation status.");
    }
    return r.result;
  }

  public async getBulkOperationStatusWithWait(
    operationId: string,
    wait = true,
    pollingDuration = 5000,
  ): Promise<any> {
    const r = await this.get(
      "/accounts/" + this.accountId + "/rules/lists/bulk_operations/" +
        operationId,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not get bulk operation status.");
    }
    if (wait) {
      const status = r.result.status;
      console.log("INFO: Bulk operation status: " + status);
      switch (status) {
        case "pending":
        case "running":
          console.log("INFO: Waiting for bulk operation to complete...");
          await sleep(pollingDuration);
          return this.getBulkOperationStatusWithWait(operationId, wait);
        case "completed":
          console.log("INFO: Bulk operation completed successfully.");
          return r.result;
        case "failed":
          console.error(r.result);
          throw new Error("Bulk operation failed.");
        default:
          console.error("ERROR: Unknown bulk operation status: " + status);
          throw new Error("Unknown bulk operation status.");
      }
    }
    return r.result;
  }

  public async deleteListItems(listId: string, items: [{ id: string }]) {
    const r = await this.delete(
      "/accounts/" + this.accountId + "/rules/lists/" + listId + "/items",
      items,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not delete list items.");
    }
    return r.result;
  }

  // Firewall
  // Rules: Security > WAF > Firewall rules
  private async setZoneIdByDomainName(domain: string) {
    const r = await this.get("/zones?name=" + domain);
    if (!r.success) {
      console.error(r);
      throw new Error("Could not find zoneId for domain " + domain);
    }
    this.zoneId = r.result[0].id;
    return r.result[0].id;
  }

  public async getFirewallRules(description: string) {
    const r = await this.get(
      "/zones/" + this.zoneId + "/firewall/rules?action=allow&description=" +
        description,
    );
    if (!r.success) {
      console.error(r);
      throw new Error("Could not get firewall rules.");
    }
    return r.result;
  }

  public async createFirewallRule(data: CreateFirewallRuleOptions) {
    const r = await this.post("/zones/" + this.zoneId + "/firewall/rules", [
      data,
    ]);
    if (!r.success) {
      console.error(r);
      throw new Error("Could not create firewall rule.");
    }
    return r.result[0];
  }

  // CRUD
  private async get(url: string) {
    const r = await fetch(CLOUDFLARE_BASE_URL + url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.apiKey,
      },
    });
    return await r.json();
  }

  private async delete(url: string, data?: any) {
    const r = await fetch(CLOUDFLARE_BASE_URL + url, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.apiKey,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    return await r.json();
  }

  private async post(url: string, data: any) {
    const r = await fetch(CLOUDFLARE_BASE_URL + url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.apiKey,
      },
      body: JSON.stringify(data),
    });
    return await r.json();
  }

  private async put(url: string, data: any) {
    const r = await fetch(CLOUDFLARE_BASE_URL + url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + this.apiKey,
      },
      body: JSON.stringify(data),
    });
    return await r.json();
  }
}
