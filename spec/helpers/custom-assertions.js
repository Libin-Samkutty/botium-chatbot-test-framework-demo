/**
 * Custom Assertions and Validation Helpers for Botium Tests
 *
 * This module provides reusable validation patterns commonly used in
 * chatbot integration tests with Botium.
 *
 * Usage in Botium convos:
 * - Include this file via CUSTOMHOOK_ONBUILD in botium config
 * - Use assertions in #bot lines with special syntax (optional future enhancement)
 */

module.exports = {
  /**
   * Validates that response contains required fields
   * @param {string} response - Bot response message
   * @param {string[]} requiredFields - Array of field names to check
   * @returns {boolean}
   */
  validateResponseContainsFields: (response, requiredFields) => {
    return requiredFields.every(field => response.includes(field));
  },

  /**
   * Validates response matches one of multiple valid patterns
   * @param {string} response - Bot response message
   * @param {string[]} validPatterns - Array of acceptable responses
   * @returns {boolean}
   */
  validateResponseOneOf: (response, validPatterns) => {
    return validPatterns.some(pattern => response.includes(pattern));
  },

  /**
   * Validates response contains a number or currency value
   * @param {string} response - Bot response message
   * @returns {boolean}
   */
  validateContainsNumericValue: (response) => {
    return /\d+/.test(response);
  },

  /**
   * Validates response contains a valid email format
   * @param {string} response - Bot response message
   * @returns {boolean}
   */
  validateContainsEmail: (response) => {
    return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(response);
  },

  /**
   * Validates response contains a phone number
   * @param {string} response - Bot response message
   * @returns {boolean}
   */
  validateContainsPhoneNumber: (response) => {
    return /[\d\s\-\+\(\)]{10,}/.test(response);
  },

  /**
   * Validates response length is within acceptable range
   * @param {string} response - Bot response message
   * @param {number} minLength - Minimum acceptable length
   * @param {number} maxLength - Maximum acceptable length
   * @returns {boolean}
   */
  validateResponseLength: (response, minLength = 10, maxLength = 5000) => {
    return response.length >= minLength && response.length <= maxLength;
  },

  /**
   * Validates response is not a default error message
   * @param {string} response - Bot response message
   * @returns {boolean}
   */
  validateNotError: (response) => {
    const errorPatterns = ['error', 'failed', 'unable to', 'sorry', 'doesn\'t understand'];
    return !errorPatterns.some(pattern => response.toLowerCase().includes(pattern));
  },

  /**
   * Example logic hook for custom message validation
   * Can be added to Botium config under LOGIC_HOOKS
   */
  createValidationHook: () => {
    return `
      botiumContainer.on('MESSAGE_RECEIVED', (msg) => {
        // Custom validation logic here
        const responseLength = msg.messageText ? msg.messageText.length : 0;
        if (responseLength < 5) {
          console.warn('[VALIDATION] Bot response too short:', msg.messageText);
        }
      });
    `;
  }
};
