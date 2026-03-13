export function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const BOM = "\uFEFF"; // UTF-8 BOM for Arabic support in Excel
  const csvContent =
    BOM +
    [headers.join(","), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join(
      "\n"
    );

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
