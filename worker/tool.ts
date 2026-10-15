// The submit_lead tool (specs/hercules-assistant/02 §3). The service enum is generated from the
// catalogue, so Hercules, the dropdown and the Services section can never drift apart.
import type Anthropic from '@anthropic-ai/sdk';
import { CONTACT_CHANNELS, LEAD_SERVICES } from './lead';

export const SUBMIT_LEAD = 'submit_lead';

export const submitLeadTool: Anthropic.Beta.Messages.BetaTool = {
  name: SUBMIT_LEAD,
  description:
    "Send the visitor's confirmed contact request to the HércuIT team by email. Call ONLY after the visitor " +
    'has reviewed the summary and explicitly confirmed and accepted the privacy notice. Never call it ' +
    'speculatively or with guessed data.',
  strict: true,
  // Streamed tool input is not validated by the API: the server always re-validates with leadSchema.
  eager_input_streaming: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['name', 'email', 'service', 'summary', 'preferredContact', 'consent'],
    properties: {
      name: { type: 'string', description: "Visitor's full name, as they wrote it" },
      email: { type: 'string', description: "Visitor's email address" },
      phone: { type: 'string', description: 'Optional phone number, digits and + only' },
      company: { type: 'string', description: 'Optional company or project name' },
      service: { type: 'string', enum: [...LEAD_SERVICES] },
      summary: {
        type: 'string',
        description: '2–5 sentences: the need, context and goals, in the conversation language',
      },
      preferredContact: {
        type: 'string',
        enum: [...CONTACT_CHANNELS],
        description: 'Channel the visitor prefers; "any" if they have no preference',
      },
      consent: {
        type: 'boolean',
        description: 'true only if the visitor explicitly accepted the privacy notice',
      },
    },
  },
};
