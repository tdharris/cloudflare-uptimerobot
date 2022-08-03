export type CloudflareOptions = {
  apiKey: string;
  domain: string;
  account: string;
};

export type CreateAccountListOptions = {
  name: string;
  kind: string;
  description: string;
};

export type CreateFirewallRuleOptions = {
  description: string;
  action: string;
  filter: {
    expression: string;
    paused?: boolean;
  };
};
