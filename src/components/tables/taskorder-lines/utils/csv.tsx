export interface Lines {
  description: string;
  task: string;
  quantity: number | "" | null;
  rate: number | "" | null;
}

export const parseCSV = ( csvText: string): Lines[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/["']/g, ""));
  const descIdx = headers.findIndex((h) => h.includes("desc"));
  const taskIdx = headers.findIndex((h) => h.includes("task"));
  const qtyIdx = headers.findIndex( (h) => h.includes("qty") || h.includes("quantity"));
  const rateIdx = headers.findIndex((h) => h.includes("rate") || h.includes("price"));
  const items: Lines[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine.toUpperCase().startsWith("TOTAL")) continue;

    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' && (c === 0 || rawLine[c - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        fields.push(cur.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
        cur = "";
      } else {
        cur += char;
      }
    }
    fields.push(cur.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));

    if (fields.length <= 1 && fields[0] === "") continue;
    const qtyVal = qtyIdx !== -1 && fields[qtyIdx] ? Number(fields[qtyIdx]) : 0;
    const rateVal = rateIdx !== -1 && fields[rateIdx] ? Number(fields[rateIdx]) : 0;

    items.push({
      description: descIdx !== -1 ? fields[descIdx] || "" : fields[0] || "",
      task: taskIdx !== -1 ? fields[taskIdx] || "" : fields[1] || "",
      quantity: isNaN(qtyVal) ? 0 : qtyVal,
      rate: isNaN(rateVal) ? 0 : rateVal,
    });
  }

  return items;
};
