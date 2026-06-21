import { HELPDOCK_PROJECT_NAME } from "@helpdock/shared";

export function createAdminShell(): string {
  return `<main><h1>${HELPDOCK_PROJECT_NAME.replace(" AI", "")} Admin</h1><p>Phase 1 placeholder shell.</p></main>`;
}
