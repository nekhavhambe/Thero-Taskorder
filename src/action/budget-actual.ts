// (async () => {
//   const SESSION_ID = window._sess;
//   const URL = `https://www-p04.intacct.com/ia/xml/ajaxgw.phtml?.sess=${SESSION_ID}`;

//   // ===== EDIT THESE =====
//   const BUDGET_ID = "Spend Budget";
//   const COMPARISON = "Budget minus Actual";   // or "Actual minus Budget"
//   const UDD_ID = "16321";
//   const PERIOD = "Inception to Date";
//   const USE_DATES = false;                    // set true if the period is rejected
//   const START = { year: "2020", month: "01", day: "01" };
//   const END   = { year: "2026", month: "12", day: "31" };  // cover the whole budget range
//   const GROUPS = [
//     "Project Revenue",
//     "Project Cost of Sales",
//     "Project Labour Cost",
//     "Project Operating Expense",
//     "Project Net Profit/(Loss)"
//   ];
//   // ======================

//   const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
//   const dateXml = (tag, d) => `<${tag}><year>${d.year}</year><month>${d.month}</month><day>${d.day}</day></${tag}>`;
//   const wrap = fn => `<?xml version="1.0" encoding="UTF-8"?>
// <request>
//   <control><senderid>null</senderid><password>null</password><controlid>controlid</controlid><uniqueid>false</uniqueid><dtdversion>3.0</dtdversion></control>
//   <operation>
//     <authentication><sessionid>${SESSION_ID}</sessionid></authentication>
//     <content>${fn}</content>
//   </operation>
// </request>`;

//   async function call(group, content, useUdd) {
//     const periodXml = USE_DATES
//       ? dateXml("startdate", START) + dateXml("enddate", END)
//       : `<reportingperiodname>${esc(PERIOD)}</reportingperiodname>`;
//     const comparisonXml = content === "Actual and Budget"
//       ? `<budgetcomparison>${COMPARISON}</budgetcomparison>` : "";
//     const uddXml = useUdd ? `
//           <userDefinedDimensions>
//             <userDefinedDimension>
//               <objectName>taskorder_budget</objectName>
//               <recordId>${UDD_ID}</recordId>
//             </userDefinedDimension>
//           </userDefinedDimensions>` : "";

//     // element order matters (schema-validated)
//     const fn = `
//       <function controlid="bva">
//         <get_accountbalancesbydimensions>
//           ${periodXml}
//           <contentselection>${content}</contentselection>
//           <budgetid>${esc(BUDGET_ID)}</budgetid>
//           ${comparisonXml}
//           <showzerowithactivity>true</showzerowithactivity>
//           <accountgroupname>${esc(group)}</accountgroupname>${uddXml}
//         </get_accountbalancesbydimensions>
//       </function>`;

//     const res = await fetch(URL, {
//       method: "POST",
//       headers: { "content-type": "application/x-www-form-urlencoded" },
//       body: new URLSearchParams({ xmlrequest: wrap(fn) }),
//       credentials: "include"
//     });
//     const text = await res.text();
//     const xml = new DOMParser().parseFromString(text, "text/xml");
//     if (xml.querySelector("result > status")?.textContent !== "success") {
//       console.error(`FAILED (${group}, ${content}, udd=${useUdd})\n` + text);
//       return null;
//     }
//     const rows = [...xml.getElementsByTagName("accountbalance")].map(r => {
//       const g = t => parseFloat(r.getElementsByTagName(t)[0]?.textContent) || 0;
//       return {
//         account: r.getElementsByTagName("glaccountno")[0]?.textContent,
//         actual: g("periodbalance"),
//         budget: g("budgetbalance"),
//         difference: g("difference")
//       };
//     });
//     return { rows, text };
//   }

//   const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
//   const summary = [];

//   for (const group of GROUPS) {
//     let r = await call(group, "Actual and Budget", true);
//     if (r && r.rows.length) {
//       console.log(`\n=== ${group} ===`);
//       console.table(r.rows);
//       summary.push({
//         group,
//         actual: sum(r.rows, "actual").toFixed(2),
//         budget: sum(r.rows, "budget").toFixed(2),
//         "difference (API)": sum(r.rows, "difference").toFixed(2),
//         "check (budget-actual)": (sum(r.rows, "budget") - sum(r.rows, "actual")).toFixed(2)
//       });
//       continue;
//     }

//     // Diagnostics for 0 rows
//     console.warn(`0 rows for "${group}" with Actual and Budget + UDD. Diagnosing...`);
//     const d1 = await call(group, "Budget", true);
//     console.log(`  Budget only, WITH UDD:    ${d1 ? d1.rows.length : "error"} rows`);
//     const d2 = await call(group, "Budget", false);
//     console.log(`  Budget only, WITHOUT UDD: ${d2 ? d2.rows.length : "error"} rows`);
//     if (d2 && d2.rows.length) {
//       console.table(d2.rows);
//       console.log(`  Total budget (no UDD filter): ${sum(d2.rows, "budget").toFixed(2)}`);
//     }
//     if (d1 && !d1.rows.length && d2 && !d2.rows.length) console.log("  Raw response:\n" + d2.text);
//   }

//   console.log("\n=== SUMMARY (ZAR) ===");
//   console.table(summary);
// })();