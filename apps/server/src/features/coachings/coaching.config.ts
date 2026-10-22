// MULTI_COACH_ENABLED (default off): may a trainee have more than one live coaching at once?
// Off = "one active coach per trainee", enforced HERE in code — never by a DB index — so turning
// it on later needs no migration.

let multiCoach = readFlag();

function readFlag(): boolean {
  return process.env.MULTI_COACH_ENABLED === 'true';
}

export function isMultiCoachEnabled(): boolean {
  return multiCoach;
}

/** Tests only: null = back to the environment's value. */
export function setMultiCoachForTests(value: boolean | null): void {
  multiCoach = value ?? readFlag();
}
