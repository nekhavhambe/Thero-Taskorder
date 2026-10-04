/** One-line summary of an Intacct <function> body for alert lines. */
export function describeIntacctBody(body: string): string {
  const control = body.match(/<function[^>]*controlid="([^"]*)"/i)?.[1] ?? '?';
  const object = body.match(/<object>([^<]*)<\/object>/i)?.[1] ?? '?';
  return `controlid=${control} object=${object}`;
}
