import { config } from "dotenv/mod.ts";

import { Cloudflare } from "./cloudflare.ts";
import { getUptimeRobotIPs } from "./uptimeRobot.ts";

config({ export: true });

async function syncIPs() {
  // Look for a list with the name "uptimerobot-ips"
  const lists = await cf.getAccountLists();
  let list = lists.find((l: { name: string }) => l.name === listName);
  if (!list) {
    console.log(`INFO: Could not find list with name '${listName}'.`);
    console.log("INFO: Creating list...");
    list = await cf.createAccountList({
      name: listName,
      kind: "ip",
      description: "Uptime Robot IPs",
    });
    console.log("INFO: List created.");
  }

  // Fetch the list of IPs from Uptime Robot
  const ips = await getUptimeRobotIPs(uptimeRobotIPsUrl);
  console.log(`INFO: Found ${ips.length} IPs from Uptime Robot.`);

  // Add the IPs to the list
  // If the list is empty, add all the IPs at once
  if (list.num_items === 0) {
    console.log("INFO: List is new or empty, adding all IPs to the list...");
    const { operation_id } = await cf.createListItems(
      list.id,
      ips.map((ip) => ({ ip })),
    );
    console.log(`INFO: Created list items. Operation ID: ${operation_id}`);
    await cf.getBulkOperationStatusWithWait(operation_id);
    console.log("INFO: All IPs added.");
    return 0;
  }

  // If the list is not empty, determine if IPs are missing from the list
  const existingIPs = await cf.getListItems(list.id);
  const missingIPs = ips.filter((ip) => !existingIPs.find((e) => e.ip === ip));
  console.log(`INFO: Found ${missingIPs.length} missing IPs.`);
  if (missingIPs.length > 0) {
    console.log("INFO: Adding all IPs to the list...");
    const { operation_id } = await cf.updateAllListItems(
      list.id,
      ips.map((ip) => ({ ip })),
    );
    console.log(`INFO: Created list items. Operation ID: ${operation_id}`);
    await cf.getBulkOperationStatusWithWait(operation_id);
    console.log("INFO: All IPs added.");
  }
}

async function createFirewallRule() {
  const r = await cf.getFirewallRules(firewallRuleDescription);
  if (r.length > 0) {
    console.log("INFO: Firewall rule already exists.");
    return 0;
  }
  if (r.length === 0) {
    // Create a new firewall rule
    console.log("INFO: Creating firewall rule...");
    const r = await cf.createFirewallRule({
      description: firewallRuleDescription,
      action: "allow",
      filter: {
        expression: `(ip.src in $${listName})`,
        paused: false,
      },
    });
    console.log(`INFO: Firewall rule created: ${r.id}.`);
  }
}

// Execute
const apiKey = Deno.env.get("CLOUDFLARE_API_KEY") || "";
const domain = Deno.env.get("CLOUDFLARE_DOMAIN") || "";
const account = Deno.env.get("CLOUDFLARE_ACCOUNT") || "";
const listName = "uptime_robot_ips";
const firewallRuleDescription = "Allow Uptime Robot IPs";
const uptimeRobotIPsUrl = Deno.env.get("UPTIME_ROBOT_IPS_URL") ||
  "https://uptimerobot.com/inc/files/ips/IPv4andIPv6.txt";

// Cloudflare client
const cf = new Cloudflare({ apiKey, domain, account });
await cf.initialize();

// Get IPs from Uptime Robot and ensure they are in the Cloudflare list
await syncIPs();

// Ensure Allow Firewall Rule exists
await createFirewallRule();
