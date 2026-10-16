import { defineConfig } from 'wxt';

// Permissions are deliberately minimal; see README "Permissions".
export default defineConfig({
  manifest: {
    name: 'Convo Keeper',
    description: 'Export your AI chat conversations to Markdown, JSON or PDF, entirely on your device.',
    permissions: ['activeTab', 'scripting', 'storage'],
    // No host_permissions and no content_scripts: code runs only when you click the toolbar button.
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },
  },
});
