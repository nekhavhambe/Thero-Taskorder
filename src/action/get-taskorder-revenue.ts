// (async () => {
//   const SESSION_ID = window._sess;
//   const URL = `https://www-p04.intacct.com/ia/xml/ajaxgw.phtml?.sess=${SESSION_ID}`;
//   const UDD_ID = "16321";
//   const EXCLUDE = []; // e.g. ["100000"] to leave out accounts that don't belong

//   const xmlRequest = `<?xml version="1.0" encoding="UTF-8"?>
// <request>
//   <control><senderid>null</senderid><password>null</password><controlid>controlid</controlid><uniqueid>false</uniqueid><dtdversion>3.0</dtdversion></control>
//   <operation>
//     <authentication><sessionid>${SESSION_ID}</sessionid></authentication>
//     <content>
//       <function controlid="project_revenue_itd">
//         <get_accountbalances>
//           <reportingperiodname>Inception to Date</reportingperiodname>
//           <accountgroupname>Project Revenue</accountgroupname>
//           <showzerobalances>false</showzerobalances>
//           <userDefinedDimensions>
//             <userDefinedDimension>
//               <objectName>taskorder_budget</objectName>
//               <recordId>${UDD_ID}</recordId>
//             </userDefinedDimension>
//           </userDefinedDimensions>
//         </get_accountbalances>
//       </function>
//     </content>
//   </operation>
// </request>`;

//   const res = await fetch(URL, {
//     method: "POST",
//     headers: { "content-type": "application/x-www-form-urlencoded" },
//     body: new URLSearchParams({ xmlrequest: xmlRequest }),
//     credentials: "include"
//   });
//   const text = await res.text();
//   const xml = new DOMParser().parseFromString(text, "text/xml");

//   if (xml.querySelector("result > status")?.textContent !== "success") {
//     console.error("FAILED\n" + text);
//     return;
//   }

//   const rows = [...xml.getElementsByTagName("accountbalance")]
//     .map(r => ({
//       account: r.getElementsByTagName("glaccountno")[0]?.textContent,
//       endbalance: parseFloat(r.getElementsByTagName("endbalance")[0]?.textContent) || 0
//     }))
//     .filter(r => !EXCLUDE.includes(r.account));

//   const total = rows.reduce((s, r) => s + r.endbalance, 0);
//   console.table(rows);
//   console.log("TOTAL CLOSING BALANCE (ZAR):", total.toFixed(2));
//   console.log("As positive revenue:", (-total).toFixed(2));
// })();