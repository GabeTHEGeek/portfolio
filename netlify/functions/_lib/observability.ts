export type TraceContext = { requestId: string };

type LogFields = Record<string, string | number | boolean | null | undefined>;

export const logStage = (context: TraceContext, event: string, fields: LogFields = {}) => {
  console.log(JSON.stringify({
    service: 'ask-gabriel',
    request_id: context.requestId,
    event,
    timestamp: new Date().toISOString(),
    ...fields
  }));
};

export const safeErrorCode = (error: unknown) => {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const candidate = error as { code?: unknown; status?: unknown; name?: unknown };
  if (typeof candidate.code === 'string') return candidate.code.slice(0, 80);
  if (typeof candidate.status === 'string') return candidate.status.slice(0, 80);
  if (typeof candidate.name === 'string') return candidate.name.slice(0, 80);
  return 'UNKNOWN';
};
