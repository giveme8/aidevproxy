import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({
  // Enable cache interception for better performance
  enableCacheInterception: true,
});
