# Advanced Botium Patterns

## Multi-Turn Conversations

Use partial conversations (pconvo) for reusable fragments:

`spec/stages/patterns/faq_flow.pconvo.txt`:
```
PCONVO_FAQ_FLOW

#me
Do you have information about appointments?

#bot
Frequently asked questions:
1. How do I book an appointment?
2. Can I reschedule?
3. What is your cancellation policy?

#me
1

#bot
To book: select specialty, choose available date, confirm appointment.
```

`spec/convo/advanced/MyTest.convo.txt`:
```
MyTest

#me
Hi

#include PCONVO_FAQ_FLOW

#me
Anything else?

#bot
Have a great day!
```

## Memory & State

Enable in botium config:
```json
{
  "botium": {
    "Capabilities": {
      "SCRIPTING_ENABLE_MEMORY": true
    }
  }
}
```

In conversations:
```
MyTest

#begin
UPDATE_CUSTOM USER_NAME|John
UPDATE_CUSTOM USER_ID|USR-12345

#me
Hi

#bot
Welcome back, John!
```

Reference variables:
```
MedicalHistoryTest

#begin
UPDATE_CUSTOM PATIENT_NAME|John Smith
UPDATE_CUSTOM PATIENT_ID|P-12345678

#me
Show my medical history

#bot
Patient: ${{PATIENT_NAME}}
ID: ${{PATIENT_ID}}
Last updated: March 20, 2026
```

## Error Handling

`spec/convo/advanced/ErrorHandling.convo.txt`:
```
AppointmentErrorHandling

#me
invalid option

#bot
I did not understand that. Please select from:
- Cardiology
- Neurology
- Dermatology
- General Practice

#me
Cardiology

#bot
Available dates: March 25, March 28, April 1
Please select a date.

#me
March 25

#bot
Appointment confirmed.
Date: March 25, 2026 at 2:00 PM
Provider: Dr. Johnson
```

Recovery pattern in `spec/stages/patterns/error_recovery.pconvo.txt`:
```
PCONVO_ERROR_RECOVERY

#me
help

#bot
I did not understand that. Available services: appointments, prescriptions, records.

#me
appointment

#bot
Which specialty would you like to schedule with?
```

## Custom Assertions

`spec/helpers/custom-assertions.js`:
```javascript
const assertions = require('../helpers/custom-assertions');

botiumContainer.on('MESSAGE_RECEIVED', (msg) => {
  const isValid = assertions.validateResponseLength(msg.messageText);
  const hasEmail = assertions.validateContainsEmail(msg.messageText);
  const hasNumber = assertions.validateContainsNumericValue(msg.messageText);

  if (!isValid) {
    throw new Error('Invalid response');
  }
});
```

Validators:
- validateResponseContainsFields(response, fields)
- validateResponseOneOf(response, patterns)
- validateContainsNumericValue(response)
- validateContainsEmail(response)
- validateContainsPhoneNumber(response)
- validateResponseLength(response, min, max)
- validateNotError(response)

## Logic Hooks

Events:
- MESSAGE_SENT: Before user message sent
- MESSAGE_SEND: During message sending
- MESSAGE_RECEIVED: After bot response
- CONVERSATION_START: Conversation start
- CONVERSATION_END: Conversation end

User ID generation:
```json
{
  "LOGIC_HOOKS": [
    {
      "ref": "GENERATE_USERID",
      "src": "const crypto = require('crypto'); botiumContainer.on('CONVERSATION_START', async (msg) => { botiumContainer.conversationState.userId = crypto.randomUUID(); });"
    }
  ]
}
```

Message logging:
```json
{
  "LOGIC_HOOKS": [
    {
      "ref": "LOG_MESSAGES",
      "src": "botiumContainer.on('MESSAGE_RECEIVED', (msg) => { console.log('[LOG]', msg.messageText.substring(0, 100)); });"
    }
  ]
}
```

Rate limiting:
```json
{
  "LOGIC_HOOKS": [
    {
      "ref": "RATE_LIMIT_DELAY",
      "src": "botiumContainer.on('MESSAGE_SEND', (msg) => { return new Promise(resolve => setTimeout(resolve, 500)); });"
    }
  ]
}
```

## Test Organization

```
spec/convo/
├── appointments/
│   ├── BookAppointment.convo.txt
│   ├── RescheduleAppointment.convo.txt
│   └── CancelAppointment.convo.txt
├── prescriptions/
│   ├── RefillPrescription.convo.txt
│   ├── ViewPrescriptions.convo.txt
│   └── UploadPrescription.convo.txt
└── advanced/
    ├── ErrorHandling.convo.txt
    └── MultiTurnConversation.convo.txt

spec/stages/
├── patterns/
│   ├── error_recovery.pconvo.txt
│   └── faq_flow.pconvo.txt
└── additional_content/
    └── user_onboarding/demo/
```

## Conversation Syntax

| Keyword | Purpose |
|---------|---------|
| #bot | Expected bot message |
| #me | User message |
| #begin | Initialization |
| #include PCONVO_NAME | Include partial conversation |
| UPDATE_CUSTOM KEY\|VALUE | Set variable |
| ${{VARIABLE}} | Reference variable |
| $random(10) | Random 10-char string |

## References

- [Botium Conversation Format](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/46596109/Conversation+Format)
- [Botium Scripting](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/46596147/Botium+Scripting)
- [Custom Connectors](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/48529409/Custom+Connectors)
- [Logic Hooks](https://botium.atlassian.net/wiki/spaces/BOTIUM/pages/46596121/Logic+Hooks)
