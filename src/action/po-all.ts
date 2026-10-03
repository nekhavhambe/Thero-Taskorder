// (async () => {
//   const SESSION_ID = window._sess;
//   const URL = `https://www-p04.intacct.com/ia/xml/ajaxgw.phtml?.sess=${SESSION_ID}`;

//   // ===== EDIT THESE =====
//   const DOCPARID = "Purchase Order";
//   const FIELDS = ["TOTAL_AMOUNT_REMAINING", "TOTAL_AMOUNT_CONVERTED"];
//   const UDD_ID = "16321";
//   const UDD_FIELD = "GLDIMTASKORDER_BUDGET";
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

//   // exact tag match (case-insensitive), searching descendants
//   const get = (root, tag) =>
//     [...root.getElementsByTagName("*")].find(e => e.tagName.toUpperCase() === tag.toUpperCase())?.textContent;

//   const sums = FIELDS.map(f => `<sum>${f}</sum>`).join("\n          ");

//   const filter = `
//     <filter>
//       <equalto>
//         <field>${UDD_FIELD}</field>
//         <value>${UDD_ID}</value>
//       </equalto>
//     </filter>`;

//   // ---------- 1) Grand totals ----------
//   const r1 = await send(`
//     <function controlid="line_total">
//       <query>
//         <object>PODOCUMENTENTRY</object>
//         <docparid>${DOCPARID}</docparid>
//         <select>
//           ${sums}
//           <count>RECORDNO</count>
//         </select>
//         ${filter}
//       </query>
//     </function>`);

//   if (r1.status !== "success") return fail("TOTAL", r1);
//   const totals = { lines: parseInt(get(r1.xml, "COUNT.RECORDNO")) || 0 };
//   FIELDS.forEach(f => totals[f] = parseFloat(get(r1.xml, `SUM.${f}`)) || 0);
//   console.log(`Totals for ${UDD_FIELD}=${UDD_ID}:`);
//   console.table([totals]);

//   // ---------- 2) Breakdown by PO status ----------
//   const r2 = await send(`
//     <function controlid="line_by_state">
//       <query>
//         <object>PODOCUMENTENTRY</object>
//         <docparid>${DOCPARID}</docparid>
//         <select>
//           <field>PODOCUMENT.STATE</field>
//           ${sums}
//           <count>RECORDNO</count>
//         </select>
//         ${filter}
//       </query>
//     </function>`);

//   if (r2.status !== "success") return fail("BY STATE", r2);
//   const rows = [...r2.xml.getElementsByTagName("PODOCUMENTENTRY")].map(r => {
//     const row = {
//       STATE: get(r, "PODOCUMENT.STATE"),
//       lines: parseInt(get(r, "COUNT.RECORDNO")) || 0
//     };
//     FIELDS.forEach(f => row[f] = parseFloat(get(r, `SUM.${f}`)) || 0);
//     return row;
//   });
//   console.table(rows);
//   FIELDS.forEach(f =>
//     console.log(`Sum of breakdown ${f}:`, rows.reduce((s, r) => s + r[f], 0).toFixed(2)));
// })();