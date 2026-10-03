// (async () => {
//   const SESSION_ID = window._sess;
//   const URL = `https://www-p04.intacct.com/ia/xml/ajaxgw.phtml?.sess=${SESSION_ID}`;

//   // ===== EDIT THESE =====
//   const DOCPARID = "Purchase Order";
//   const FIELD = "TOTAL_AMOUNT_REMAINING";
//   const UDD_ID = "16321";                       // dimension record ID/value
//   let UDD_FIELD = "GLDIMTASKORDER_BUDGET";      // verified by step 0 below
//   // ======================

//   const wrap = fn => `<?xml version="1.0" encoding="UTF-8"?>
// <request>
//   <control><senderid>null</senderid><password>null</password><controlid>controlid</controlid><uniqueid>false</uniqueid><dtdversion>3.0</dtdversion></control>
//   <operation>
//     <authentication><sessionid>${SESSION_ID}</sessionid></authentication>
//     <content>${fn}</content>
//   </operation>
// </request>`;

//   async function send(fn) {
//     const res = await fetch(URL, {
//       method: "POST",
//       headers: { "content-type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({ xmlrequest: wrap(fn) }),
//       credentials: "include"
//     });
//     const text = await res.text();
//     const xml = new DOMParser().parseFromString(text, "text/xml");
//     const status = xml.querySelector("result > status")?.textContent;
//     return { text, xml, status };
//   }
//   const fail = (label, r) => console.error(`${label} FAILED\n` + r.text);
//   const find = (root, prefix) =>
//     [...root.getElementsByTagName("*")].find(e => e.tagName.toUpperCase().startsWith(prefix));

//   // ---------- 0) Discover the UDD field name ----------
//   const r0 = await send(`<function controlid="lk"><lookup><object>PODOCUMENTENTRY</object></lookup></function>`);
//   if (r0.status !== "success") return fail("LOOKUP", r0);
//   const gldim = [...r0.xml.getElementsByTagName("Field")]
//     .map(f => f.getElementsByTagName("ID")[0]?.textContent)
//     .filter(id => id && id.toUpperCase().startsWith("GLDIM"));
//   console.log("UDD fields on PODOCUMENTENTRY:", gldim);
//   if (!gldim.includes(UDD_FIELD)) {
//     console.warn(`${UDD_FIELD} not found; set UDD_FIELD to one of the above and rerun.`);
//     return;
//   }

//   // ---------- 1) Total of remaining amount on matching lines ----------
//   const filter = `
//     <filter>
//       <equalto>
//         <field>${UDD_FIELD}</field>
//         <value>${UDD_ID}</value>
//       </equalto>
//     </filter>`;

//   const r1 = await send(`
//     <function controlid="line_total">
//       <query>
//         <object>PODOCUMENTENTRY</object>
//         <docparid>${DOCPARID}</docparid>
//         <select>
//           <sum>${FIELD}</sum>
//           <count>RECORDNO</count>
//         </select>
//         ${filter}
//       </query>
//     </function>`);

//   if (r1.status !== "success") return fail("TOTAL", r1);
//   const sumEl = find(r1.xml, "SUM");
//   const cntEl = find(r1.xml, "COUNT");
//   if (!sumEl) return console.warn("No SUM element. Raw:\n" + r1.text);
//   console.log(`TOTAL ${FIELD} for ${UDD_FIELD}=${UDD_ID}:`,
//     parseFloat(sumEl.textContent).toFixed(2), `(${cntEl?.textContent} lines)`);

//   // ---------- 2) Breakdown by PO status ----------
//   const r2 = await send(`
//     <function controlid="line_by_state">
//       <query>
//         <object>PODOCUMENTENTRY</object>
//         <docparid>${DOCPARID}</docparid>
//         <select>
//           <field>PODOCUMENT.STATE</field>
//           <sum>${FIELD}</sum>
//           <count>RECORDNO</count>
//         </select>
//         ${filter}
//       </query>
//     </function>`);

//   if (r2.status !== "success") return fail("BY STATE", r2);
//   const rows = [...r2.xml.getElementsByTagName("PODOCUMENTENTRY")].map(r => ({
//     STATE: find(r, "PODOCUMENT.STATE")?.textContent,
//     lines: parseInt(find(r, "COUNT")?.textContent) || 0,
//     remaining: parseFloat(find(r, "SUM")?.textContent) || 0
//   }));
//   console.table(rows);
//   console.log("Sum of breakdown:", rows.reduce((s, r) => s + r.remaining, 0).toFixed(2));
// })();