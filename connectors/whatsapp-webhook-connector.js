/**
 * Custom WhatsApp Webhook Connector for Botium
 *
 * Features:
 * - HMAC SHA-256 signature generation for webhook authentication
 * - Message ID and timestamp injection
 * - Handles WhatsApp message format (text, interactive types)
 * - Request/response hooks for payload transformation
 * - Conversation ID management per WhatsApp recipient
 *
 * Used in: botium.demo-stage-wa.json, botium.demo-prod-wa.json
 */

const util = require('util')
const randomize = require('randomatic')
const uuidv4 = require('uuid/v4')
const debug = require('debug')('botium-connector-whatsapp')
const crypto = require('crypto')


const SimpleRestContainer = require('botium-core/src/containers/plugins/SimpleRestContainer')
const { Capabilities: CoreCapabilities } = require('botium-core')

const Capabilities = {
  WHATSAPP_WEBHOOKURL: 'WHATSAPP_WEBHOOKURL',
  WHATSAPP_RECIPIENTID: 'WHATSAPP_RECIPIENTID',
  WHATSAPP_WEBHOOK_SECRET: 'WHATSAPP_WEBHOOK_SECRET'
}
const Defaults = {
}

class BotiumConnectorWhatsapp {
  constructor ({ queueBotSays, caps }) {
    console.log('[WhatsApp] Constructor called')
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.delegateContainer = null
    this.delegateCaps = null
    this.whatsappId = null
  }

  Validate () {
    console.log('[WhatsApp] Validate called')
    debug('Validate called')

    this.caps = Object.assign({}, Defaults, this.caps)
    console.log('[WhatsApp] Capabilities loaded:', Object.keys(this.caps).filter(k => k.includes('WHATSAPP')))

    if (!this.caps[Capabilities.WHATSAPP_WEBHOOKURL]) throw new Error('WHATSAPP_WEBHOOKURL capability required')
    this.whatsappId = this.caps[Capabilities.WHATSAPP_RECIPIENTID] || `BOTIUM-WA-${randomize('A0', 10)}`

    console.log('[WhatsApp] this.whatsappId:', this.whatsappId)
    console.log('[WhatsApp] WHATSAPP_RECIPIENTID capability:', this.caps[Capabilities.WHATSAPP_RECIPIENTID])
    console.log('[WhatsApp] Webhook URL:', this.caps[Capabilities.WHATSAPP_WEBHOOKURL])

    if (!this.delegateContainer) {
      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: this.caps[Capabilities.WHATSAPP_WEBHOOKURL],
        [CoreCapabilities.SIMPLEREST_METHOD]: 'POST',
        [CoreCapabilities.SIMPLEREST_CONVERSATION_ID_TEMPLATE]: this.whatsappId,
        [CoreCapabilities.SIMPLEREST_HEADERS_TEMPLATE]: {},
        [CoreCapabilities.SIMPLEREST_BODY_TEMPLATE]:
          `{
            "messages": [
              {
                "recipient_type": "individual",
                "from": "${this.whatsappId}",
                "type": "text",
                "text": {}
              }
            ]
          }`,
        [CoreCapabilities.SIMPLEREST_REQUEST_HOOK]: ({ requestOptions, msg, botium }) => {
          console.log('[WhatsApp] REQUEST_HOOK START')
          console.log('[WhatsApp] REQUEST_HOOK - msg.messageText:', msg.messageText)
          console.log('[WhatsApp] REQUEST_HOOK - msg.WHATSAPP_RECIPIENTID:', msg.WHATSAPP_RECIPIENTID)
          console.log('[WhatsApp] REQUEST_HOOK - this.whatsappId:', this.whatsappId)
          console.log('[WhatsApp] REQUEST_HOOK - msg object keys:', Object.keys(msg))

          if (msg.WHATSAPP_RECIPIENTID) {
            console.log('[WhatsApp] REQUEST_HOOK - Setting conversationId:', msg.WHATSAPP_RECIPIENTID)
            botium.conversationId = msg.WHATSAPP_RECIPIENTID
          }

          const body = requestOptions.body
          let message = body.messages[0]
          message.id = uuidv4()
          message.timestamp = Date.now()
          message.text.body = msg.messageText

          console.log('[WhatsApp] REQUEST_HOOK - Before setting from - message.from:', message.from)
          message.from = msg.WHATSAPP_RECIPIENTID || this.whatsappId
          console.log('[WhatsApp] REQUEST_HOOK - After setting from - message.from:', message.from)
          console.log('[WhatsApp] REQUEST_HOOK - Message ID:', message.id)

          message = {
            "contacts": [{
              "wa_id": message.from
            }],
            "messages": [message]
          }
          console.log('[WhatsApp] REQUEST_HOOK - Final message structure ready')

          let WAAppSecret = ''
          if (this.caps[Capabilities.WHATSAPP_WEBHOOK_SECRET]) {
            WAAppSecret = this.caps[Capabilities.WHATSAPP_WEBHOOK_SECRET]
          }
          const hash = crypto.createHmac('sha256', WAAppSecret).update(JSON.stringify(message)).digest('base64');
          console.log('[WhatsApp] REQUEST_HOOK - HMAC Hash generated')
          requestOptions.headers['x-turn-hook-signature'] = hash
          requestOptions.body = message
          console.log('[WhatsApp] REQUEST_HOOK END - URL:', requestOptions.url, 'From:', message.messages[0].from)
        },
        [CoreCapabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          console.log('[WhatsApp] RESPONSE_HOOK - Received response')
          debug(`Response Body: ${util.inspect(botMsg.sourceData, false, null, true)}`)
          const message = botMsg.sourceData
          console.log('[WhatsApp] RESPONSE_HOOK - Message type:', message?.type, 'Has text body:', !!(message?.text?.body))

          if ((message.type === 'text' || message.type === 'interactive') && message.text && message.text.body) {
            botMsg.messageText = message.text.body
            console.log('[WhatsApp] RESPONSE_HOOK - Extracted messageText:', message.text.body)
          }
          else {
            console.log('[WhatsApp] RESPONSE_HOOK - WARNING: unsupported message type or missing text body')
            console.log('[WhatsApp] RESPONSE_HOOK - Message structure:', util.inspect(message, false, null, true))
            debug(`WARNING: recieved unsupported message: ${message}`)
          }
        },
        [CoreCapabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH]: '$.body.to',
        [CoreCapabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE]: '{{botium.conversationId}}'
      }
      for (const capKey of Object.keys(this.caps).filter(c => c.startsWith('SIMPLEREST'))) {
        if (!this.delegateCaps[capKey]) this.delegateCaps[capKey] = this.caps[capKey]
      }
      console.log('[WhatsApp] Validate - Setting up delegate container')
      debug(`Validate delegateCaps ${util.inspect(this.delegateCaps)}`)
      this.delegateContainer = new SimpleRestContainer({ queueBotSays: this.queueBotSays, caps: this.delegateCaps })
    }

    debug('Validate delegate')
    console.log('[WhatsApp] Validate - Calling delegate.Validate()')
    return this.delegateContainer.Validate()
  }

  async Build () {
    console.log('[WhatsApp] Build - Starting')
    await this.delegateContainer.Build()
    console.log('[WhatsApp] Build - Complete')
  }

  async Start () {
    console.log('[WhatsApp] Start - Starting')
    await this.delegateContainer.Start()
    console.log('[WhatsApp] Start - Complete')
  }

  async UserSays (msg) {
    console.log('[WhatsApp] UserSays - Sending message:', msg.messageText)
    try {
      await this.delegateContainer.UserSays(msg)
      console.log('[WhatsApp] UserSays - Message sent successfully')
    } catch (err) {
      console.log('[WhatsApp] UserSays - Error:', err.message)
      throw err
    }
  }

  async Stop () {
    console.log('[WhatsApp] Stop - Stopping')
    await this.delegateContainer.Stop()
    console.log('[WhatsApp] Stop - Complete')
  }

  async Clean () {
    console.log('[WhatsApp] Clean - Cleaning up')
    await this.delegateContainer.Clean()
    console.log('[WhatsApp] Clean - Complete')
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorWhatsapp
}
