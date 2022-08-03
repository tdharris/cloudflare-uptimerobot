export async function getUptimeRobotIPs(url: string, ipv6 = false) {
  try {
    const r = await fetch(url);
    const text = await r.text();
    const ips = text.split("\r\n").filter((ip) => ip.length > 0);
    if (ipv6) {
      return ips;
    }
    return ips.filter((ip) => ip.indexOf(":") === -1);
  } catch (err) {
    console.error(err);
    throw new Error("Could not get IPs from Uptime Robot.");
  }
}
