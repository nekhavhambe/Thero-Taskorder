export interface NewTaskOrderOverrides {
  /** Extra / overriding form values applied before submit. */
  values?: Record<string, string>;
  /** Navigate to the response URL when a record is created. Defaults to true. */
  redirectOnSuccess?: boolean;
}

export interface NewTaskOrderResult {
  ok: boolean;
  status: number;
  redirected: boolean;
  url: string;
  /** Created record id parsed from the Intacct response, when found. */
  createdId?: string;
}

const SUCCESS_PATTERN = /(\d+)<\/a>\s*has been created/;

/**
 * Pulls the live DOM form into FormData, applies value overrides,
 * POSTs it via fetch, and redirects to the response URL on success.
 */
export async function submitNewTaskOrder(
  form: HTMLFormElement,
  overrides: NewTaskOrderOverrides = {},
): Promise<NewTaskOrderResult> {
  const { values = { task_description: 'martin is boss' }, redirectOnSuccess = true } = overrides;

  const formData = new FormData(form);
  // All fields retrieved from newForm, before overrides.
  console.log('newForm fields:', Object.fromEntries(formData.entries()));
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }

  // Final payload actually submitted (overrides applied).
  console.log('submitting:', Object.fromEntries(formData.entries()));

  const response = await fetch(form.action, {
    method: form.method || 'POST',
    body: formData,
    credentials: 'same-origin',
  });
  console.log('status:', response.status, 'redirected:', response.redirected, 'url:', response.url);

  const html = await response.text();
  // Intacct unicode-escapes the HTML (\u003c\u002fa\u003e for </a>),
  // so decode escapes before looking for the success message.
  const decoded = html.replace(/\\u([\dA-Fa-f]{4})/g, (_, hex: string) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
  const created = decoded.match(SUCCESS_PATTERN);

  if (created) {
    console.log(`TaskOrder Budget ${created[1]} has been created.`);
    if (redirectOnSuccess) {
      window.location.assign(response.url);
    }
    return { ok: true, status: response.status, redirected: response.redirected, url: response.url, createdId: created[1] };
  }

  console.log(html);
  return { ok: false, status: response.status, redirected: response.redirected, url: response.url };
}
