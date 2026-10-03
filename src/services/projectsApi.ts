import { intacctField, sendIntacctFunction } from './intacct';
import type { Project } from '../components/types';

const PAGE_SIZE = 500;

/**
 * Lists every project via the Intacct query API (PROJECTID + NAME + CURRENCY),
 * following pages until `numremaining` hits zero.
 */
export async function fetchIntacctProjects(): Promise<Project[]> {
  const rows: Project[] = [];
  let offset = 0;

  for (;;) {
    const { xml, status, text } = await sendIntacctFunction(`
      <function controlid="project_list">
        <query>
          <object>PROJECT</object>
          <select>
            <field>PROJECTID</field>
            <field>NAME</field>
            <field>CURRENCY</field>
          </select>
          <orderby>
            <order><field>PROJECTID</field><ascending /></order>
          </orderby>
          <pagesize>${PAGE_SIZE}</pagesize>
          <offset>${offset}</offset>
        </query>
      </function>`);

    if (status !== 'success') {
      throw new Error(`PROJECT query failed: ${text.slice(0, 500)}`);
    }

    const recs = xml.getElementsByTagName('PROJECT');
    for (let i = 0; i < recs.length; i += 1) {
      const rec = recs[i];
      const id = intacctField(rec, 'PROJECTID')?.trim() ?? '';
      if (!id) continue;
      rows.push({
        id,
        name: intacctField(rec, 'NAME')?.trim() || id,
        currency: intacctField(rec, 'CURRENCY')?.trim() || undefined,
      });
    }

    const remaining = parseInt(xml.querySelector('data')?.getAttribute('numremaining') ?? '0', 10) || 0;
    if (recs.length === 0 || remaining === 0) break;
    offset += PAGE_SIZE;
  }

  console.log(`Intacct projects: ${rows.length}`);
  return rows;
}
