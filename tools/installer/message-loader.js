const fs = require('fs-extra');
const path = require('node:path');
const yaml = require('yaml');
const prompts = require('./prompts');

/**
 * Load and display installer messages from messages.yaml
 */
class MessageLoader {
  constructor() {}

  /**
   * Load messages from the YAML file
   * @returns {Object|null} Messages object or null if not found
   */
  load() {
    if (this.messages) {
      return this.messages;
    }

    const messagesPath = path.join(__dirname, 'install-messages.yaml');

    try {
      const content = fs.readFileSync(messagesPath, 'utf8');
      this.messages = yaml.parse(content);
      return this.messages;
    } catch {
      // File doesn't exist or is invalid - return null
      return null;
    }
  }

  /**
   * Resolve `{version}` placeholders against the current package.json
   * version. Falls back to leaving the placeholder in place if the
   * package.json can't be loaded — never throws into the install flow.
   * @param {string|null} message
   * @returns {string|null}
   */
  interpolate(message) {
    if (!message) return message;
    let version;
    try {
      version = require('../../package.json').version;
    } catch {
      return message;
    }
    return message.replaceAll('{version}', version);
  }

  /**
   * Get the start message for display
   * @returns {string|null} Start message or null
   */
  getStartMessage() {
    const messages = this.load();
    return this.interpolate(messages?.startMessage || null);
  }

  /**
   * Get the end message for display
   * @returns {string|null} End message or null
   */
  getEndMessage() {
    const messages = this.load();
    return this.interpolate(messages?.endMessage || null);
  }

  /**
   * Display the start message (after logo, before prompts)
   */
  async displayStartMessage() {
    const message = this.getStartMessage();
    if (message) {
      await prompts.log.info(message);
    }
  }

  /**
   * Display the end message (after installation completes)
   */
  async displayEndMessage() {
    const message = this.getEndMessage();
    if (message) {
      await prompts.log.info(message);
    }
  }

  /**
   * Check if messages exist for the current version
   * @param {string} currentVersion - Current package version
   * @returns {boolean} True if messages match current version
   */
  isCurrent(currentVersion) {
    const messages = this.load();
    return messages && messages.version === currentVersion;
  }
  messages = null;
}

module.exports = { MessageLoader };
