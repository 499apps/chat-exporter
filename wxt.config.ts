import { defineConfig } from 'wxt';

// Permissions are deliberately minimal; see README "Permissions".
export default defineConfig({
  manifest: {
    name: 'Convo Keeper',
    description: 'Export your AI chat conversations to Markdown, JSON or PDF, entirely on your device.',
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    action: {
      default_title: 'Convo Keeper',
      default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    },
    permissions: ['activeTab', 'scripting', 'storage'],
    // No host_permissions and no content_scripts: code runs only when you click the toolbar button.
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },
  },
});
