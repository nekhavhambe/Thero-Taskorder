// (async () => {
//   const SESSION_ID = window._sess;
//   const URL = `https://www-p04.intacct.com/ia/xml/ajaxgw.phtml?.sess=${SESSION_ID}`;

//   // ===== EDIT THESE =====
//   const DOCPARID = "Purchase Requisition";
//   const DOC_FIELD = "DOCHDRID";                 // doc number
//   const SUPPLIER_ID_FIELD = "VENDORID";         // line-level Supplier (or "PODOCUMENT.VENDORID" for header)
//   const SUPPLIER_NAME_FIELD = "VENDORNAME";     // line-level Supplier name (or "PODOCUMENT.VENDORNAME")
//   const NET_FIELD = "TOTAL";                    // Extended price (net of tax); TRX_VALUE for txn currency
//   const VAT_FIELD = "TAXABSVAL";                // Tax; TRX_TAXABSVAL for txn currency
//   const GROSS_FIELD = "LINETOTAL";              // Gross amount; TRX_LINETOTAL for txn currency
//   const UDD_FIELD = "GLDIMTASKORDER_BUDGET";
//   const UDD_ID = "16321";
//   const PAGE_SIZE = 2000;
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

//   const get = (root, tag) =>
//     [...root.getElementsByTagName("*")].find(e => e.tagName.toUpperCase() === tag.toUpperCase())?.textContent;
//   const num = v => parseFloat(v) || 0;

//   const rows = [];
//   let offset = 0;

//   while (true) {
//     const r = await send(`
//       <function controlid="pr_docs">
//         <query>
//           <object>PODOCUMENTENTRY</object>
//           <docparid>${DOCPARID}</docparid>
//           <select>
//             <field>${DOC_FIELD}</field>
//             <field>${SUPPLIER_ID_FIELD}</field>
//             <field>${SUPPLIER_NAME_FIELD}</field>
//             <sum>${NET_FIELD}</sum>
//             <sum>${VAT_FIELD}</sum>
//             <sum>${GROSS_FIELD}</sum>
//             <count>RECORDNO</count>
//           </select>
//           <filter>
//             <equalto>
//               <field>${UDD_FIELD}</field>
//               <value>${UDD_ID}</value>
//             </equalto>
//           </filter>
//           <orderby>
//             <order><field>${DOC_FIELD}</field><ascending /></order>
//           </orderby>
//           <pagesize>${PAGE_SIZE}</pagesize>
//           <offset>${offset}</offset>
//         </query>
//       </function>`);

//     if (r.status !== "success") return console.error("QUERY FAILED\n" + r.text);

//     const recs = [...r.xml.getElementsByTagName("PODOCUMENTENTRY")];
//     recs.forEach(rec => {
//       const net = num(get(rec, `SUM.${NET_FIELD}`));
//       const vat = num(get(rec, `SUM.${VAT_FIELD}`));
//       const gross = num(get(rec, `SUM.${GROSS_FIELD}`));
//       rows.push({
//         DocNo: get(rec, DOC_FIELD),
//         SupplierID: get(rec, SUPPLIER_ID_FIELD),
//         SupplierName: get(rec, SUPPLIER_NAME_FIELD),
//         Lines: parseInt(get(rec, "COUNT.RECORDNO")) || 0,
//         Net: net,
//         VAT: vat,
//         Gross: gross,
//         Diff: +(gross - (net + vat)).toFixed(2)   // should be 0
//       });
//     });

//     const remaining = parseInt(r.xml.querySelector("data")?.getAttribute("numremaining")) || 0;
//     if (!recs.length || remaining === 0) break;
//     offset += PAGE_SIZE;
//   }

//   console.table(rows);
//   const sum = k => rows.reduce((s, r) => s + r[k], 0).toFixed(2);
//   console.log(`Docs: ${rows.length} | Lines: ${rows.reduce((s, r) => s + r.Lines, 0)}`);
//   console.log(`Net: ${sum("Net")} | VAT: ${sum("VAT")} | Gross: ${sum("Gross")}`);

//   // CSV to clipboard (Chrome console `copy`)
//   try {
//     const hdr = Object.keys(rows[0]).join(",");
//     const csv = [hdr, ...rows.map(r => Object.values(r).map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
//     copy(csv);
//     console.log("CSV copied to clipboard.");
//   } catch (e) { /* copy() only exists in devtools console */ }
// })();