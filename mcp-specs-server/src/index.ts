import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const server = new Server(
  {
    name: "hercuit-specs-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const COMPONENT_SPEC_SCHEMA = z.object({
  name: z.string().describe("The name of the component (e.g., ContactForm)"),
  purpose: z.string().describe("What the component does"),
  props: z.array(z.string()).optional().describe("List of props for the component"),
});

const QUALITY_PLAN_SCHEMA = z.object({
  feature: z.string().describe("The feature to create a test plan for"),
  complexity: z.enum(["low", "medium", "high"]),
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_component_spec",
        description: "Generate a technical specification for a new Hércuit component following project standards.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            purpose: { type: "string" },
            props: { type: "array", items: { type: "string" } },
          },
          required: ["name", "purpose"],
        },
      },
      {
        name: "create_quality_test_plan",
        description: "Generate a detailed quality test plan aligned with the Hércuit Quality Mandate.",
        inputSchema: {
          type: "object",
          properties: {
            feature: { type: "string" },
            complexity: { type: "string", enum: ["low", "medium", "high"] },
          },
          required: ["feature", "complexity"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "create_component_spec") {
    const { name: compName, purpose, props = [] } = COMPONENT_SPEC_SCHEMA.parse(args);
    const spec = `
# Component Spec: ${compName}

## Purpose
${purpose}

## Hércuit Quality Standards Compliance
- **String Management:** All UI text must be defined in both locale dictionaries (\`src/constants/strings/es.ts\` and \`en.ts\`) and read via \`useStrings(Astro.currentLocale)\`.
- **Astro Integration:** Use .astro components with minimal client-side JS.
- **Styling:** Utilize Tailwind CSS v4 directives.

## Props
${props.length > 0 ? props.map(p => `- \`${p}\``).join('\n') : "No external props defined."}

## Implementation Checklist
- [ ] Add strings to both \`es.ts\` and \`en.ts\` (\`npm run check\` must pass).
- [ ] Create \`src/components/${compName}.astro\`.
- [ ] Implement responsive design.
- [ ] Verify accessibility (ARIA labels).
`;
    return {
      content: [{ type: "text", text: spec }],
    };
  }

  if (name === "create_quality_test_plan") {
    const { feature, complexity } = QUALITY_PLAN_SCHEMA.parse(args);
    const plan = `
# Quality Test Plan: ${feature} (Complexity: ${complexity})

## Quality Mandate Alignment
This feature must adhere to the Hércuit focus on reliability and performance.

## Test Areas
1. **Functional Verification:**
   - [ ] Feature performs its primary role as defined in specs.
   - [ ] Edge cases (empty states, large inputs) are handled gracefully.

2. **Performance Audit:**
   - [ ] Sub-second load time impact.
   - [ ] Minimal hydration cost (Astro Islands usage).

3. **Accessibility & Responsive Check:**
   - [ ] Pass WCAG 2.1 AA standards.
   - [ ] Consistent behavior across mobile, tablet, and desktop.

4. **String Integrity:**
   - [ ] 100% of UI text consumed from centralized string management.
`;
    return {
      content: [{ type: "text", text: plan }],
    };
  }

  throw new Error(`Tool not found: ${name}`);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hércuit Specs MCP Server running on stdio");
}

runServer().catch(console.error);
