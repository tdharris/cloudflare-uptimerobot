# Cloudflare Uptime Robot

This synchronizes the Uptime Robot IP address with a Cloudflare IP List used in
a Firewall Rule expression to allow through the WAF (Web Application Firewall).

The following resources are created in Cloudflare:

- [Firewall Rule](https://developers.cloudflare.com/firewall/cf-dashboard/):
  `Allow Uptime Robot IPs`
- [IP List](https://developers.cloudflare.com/firewall/cf-dashboard/rules-lists/):
  `uptime_robot_ips` (populated with
  [Uptime Robot IPs](https://uptimerobot.com/inc/files/ips/IPv4andIPv6.txt))

## Usage

1. Cloudflare:

   - Determine the `Domain` or `Website` such as `mydomain.com`.
   - Determine the
     [Account Name](https://developers.cloudflare.com/fundamentals/account-and-billing/account-setup/customize-account/account-name/)
     such as the default `<<YOUR_EMAIL_ADDRESS>>'s Account`.
   - Create an [API Token](https://developers.cloudflare.com/api/tokens/create/)
     with the following permissions:
     - `Account:Account Settings:Read`
     - `Account:Account Filter Lists:Edit`
     - `Zone:Firewall Services: Edit`

2. Environment File:

   - Copy `.env.sample` to `.env`.
   - Update the `CLOUDFLARE` variables with their appropriate values retrieved
     above.

3. Execute:

   ```console
   ./start.sh
   ```

4. Schedule:

   - Setup a routine execution with perhaps Cron to keep the IP List up to date.

### Notes

- The Cloudflare IP List is only recreated if any IPs are found to be missing.
- IPv6 is not supported by Cloudflare within an IP List at this time, so those
  addresses are filtered out.

## Resources

- [Uptime Robot IP List](https://uptimerobot.com/inc/files/ips/IPv4andIPv6.txt)
- [Cloudflare Firewall Rules](https://developers.cloudflare.com/firewall/cf-dashboard/)
- [Cloudflare IP Lists](https://developers.cloudflare.com/firewall/cf-dashboard/rules-lists/)
- [Cloudflare API v4 Documentation](https://api.cloudflare.com/)
- [Cloudflare API Token Permissions](https://developers.cloudflare.com/api/tokens/create/permissions/)
