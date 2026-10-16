import { defineConfig } from 'wxt';

// Permissions are deliberately minimal; see README "Permissions".
export default defineConfig({
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    action: {
      default_title: '__MSG_actionTitle__',
      default_icon: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    },
    permissions: ['activeTab', 'scripting', 'storage'],
    // No host_permissions and no content_scripts: code runs only when you use the extension.
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+E', mac: 'Alt+Shift+E' },
        description: '__MSG_cmdOpen__',
      },
    },
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },
  },
});
