export const BODY_WARNING_BYTES: number;
export const BODY_WARNING_EXAMPLES: number;
/** Omitted maxBodyBytes or null means no body ceiling. */
export interface BodyPolicyOptions { maxBodyBytes?: number | null; }
export function normalizeBodyPolicy(options?: BodyPolicyOptions): { maxBodyBytes: number | null };
export class BodyByteCounter {
  constructor(policy?: BodyPolicyOptions);
  readonly exceeded: boolean;
  bytes: number;
  write(text: string): number;
  finish(): number;
}
export class ContentBodySizeError extends Error {
  code: 'CONTENT_BODY_TOO_LARGE';
  details: { id: string; bodyBytes: number; limitBytes: number; representation: string; exact: boolean };
  constructor(id: string | number, bytes: number, representation: string | undefined, limitBytes: number);
}
export interface ContentBodyWarning {
  code: 'CONTENT_BODY_LARGE';
  count: number;
  affected: string[];
  maxBodyBytes: number;
  omittedExamples: number;
  message: string;
}
export function safeBodyIdentifier(value: unknown): string;
export function checkBodySize(content: string, id: string | number, representation?: string, policy?: BodyPolicyOptions): number;
export function assertBodyBytes(bytes: number, id: string | number, representation?: string, policy?: BodyPolicyOptions): number;
export function createBodyWarningCollector(): {
  add(id: string | number, bytes: number): void;
  warnings(): ContentBodyWarning[];
};
