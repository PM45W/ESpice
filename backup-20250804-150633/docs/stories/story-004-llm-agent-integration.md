# Story 004: Integrated LLM Agent for Q&A and In-App Actions

**Story ID**: ST-004  
**Sequence**: 5  
**Status**: Draft  
**Priority**: High  
**Story Points**: 13  
**Assigned To**: Development Team  
**Created**: July 2025  
**Target Sprint**: October 2025

---

## Story

**As a** user,
**I want** an integrated AI assistant that can answer questions and perform actions in the app via natural language,
**so that** I can work more efficiently, discover features, and automate workflows.

## Acceptance Criteria

1. Users can open an AI assistant/chat widget from any page in the app (web and desktop).
2. The assistant can answer questions about app features, workflows, and domain knowledge.
3. The assistant can perform in-app actions (e.g., create project, change theme, invite team member) via natural language commands.
4. The assistant uses a free, reliable LLM API accessible from Hong Kong (HK).
5. All actions are permission-checked and require user confirmation for sensitive operations.
6. The assistant maintains user/session context for personalized responses.
7. All assistant actions and responses are logged for audit and debugging.
8. The assistant UI is accessible and responsive on all devices.
9. Documentation and onboarding are provided for using the AI assistant.

## Tasks / Subtasks

- [ ] Research and select a free LLM API that works in HK (e.g., OpenRouter, LM Studio, Ollama, or other open/free endpoints)
- [ ] Design and implement the assistant UI (chat widget, sidebar, or command palette)
- [ ] Integrate the LLM API for Q&A and function calling
- [ ] Implement backend endpoints for safe action execution (with permission checks)
- [ ] Map natural language commands to app actions (function calling/tool use)
- [ ] Add context management for personalized and relevant responses
- [ ] Log all assistant actions and responses
- [ ] Ensure accessibility and responsive design for the assistant UI
- [ ] Write documentation and onboarding guides

## Dev Notes

- This story should be implemented last, after all backend, data acquisition, and UI features are in place, so the LLM agent can leverage the full capabilities of the platform.
- Use OpenRouter (https://openrouter.ai/) as a free LLM API (supports GPT-3.5/4, Claude, etc., and is accessible in HK; requires free API key)
- For local/offline: LM Studio (https://lmstudio.ai/) or Ollama (https://ollama.com/) can run open models for free, but require user setup
- Use OpenAI function calling or similar for mapping commands to actions
- Use React for the chat widget; Tauri for desktop integration
- Backend: Node.js/Express or Python/FastAPI for secure action endpoints
- Reference: `src/components/Assistant/`, `src/services/llmService.ts`, `src-tauri/src/assistant.rs`

## Testing

- Unit and integration tests for assistant Q&A and action execution
- Security and permission tests for all actions
- Cross-device and cross-browser UI/UX testing
- Logging and audit trail verification

## Change Log

| Date       | Version | Description                                 | Author      |
|------------|---------|---------------------------------------------|-------------|
| 2025-07-22 | 1.0     | Initial story draft                         | scrum-master|

## Dev Agent Record

*To be filled by development agent*

## QA Results

*To be filled by QA agent* 