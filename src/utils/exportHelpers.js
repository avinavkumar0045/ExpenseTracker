import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

/**
 * Export data to CSV file with proper escaping and UTF-8 BOM for Excel
 */
export function exportToCSV(data, headers, filename) {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  // Build CSV content
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headerRow = headers.map(h => escapeCSV(h.label)).join(',')
  const rows = data.map(row =>
    headers.map(h => escapeCSV(h.key.split('.').reduce((obj, k) => obj?.[k], row))).join(',')
  )

  const csvContent = [headerRow, ...rows].join('\n')

  // Add UTF-8 BOM for Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(link.href)
}

/**
 * Export data to PDF using jsPDF + autotable
 * Styled with dark theme colors
 */
export function exportToPDF(title, subtitle, headers, data, filename) {
  if (!data || data.length === 0) {
    throw new Error('No data to export')
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // Header background (dark theme style)
  doc.setFillColor(10, 10, 10)
  doc.rect(0, 0, 210, 35, 'F')

  // Title
  doc.setTextColor(200, 246, 90)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 18)

  // Subtitle
  doc.setTextColor(153, 153, 153)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(subtitle, 14, 26)

  // Date
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32)

  // Table
  autoTable(doc, {
    startY: 42,
    head: [headers.map(h => h.label)],
    body: data.map(row =>
      headers.map(h => h.key.split('.').reduce((obj, k) => obj?.[k], row) ?? '-')
    ),
    headStyles: {
      fillColor: [30, 30, 30],
      textColor: [200, 246, 90],
      fontStyle: 'bold',
      fontSize: 10
    },
    bodyStyles: {
      fillColor: [20, 20, 20],
      textColor: [220, 220, 220],
      fontSize: 9
    },
    alternateRowStyles: {
      fillColor: [26, 26, 26]
    },
    gridColor: [40, 40, 40],
    lineColor: [40, 40, 40],
    styles: {
      cellPadding: 3,
      overflow: 'linebreak'
    }
  })

  // Footer
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' })
    doc.text('ExpenseFlow - Advanced Expense Tracker', 14, 290)
  }

  doc.save(`${filename}.pdf`)
}

/**
 * Format currency for export
 */
export function formatCurrency(amount) {
  return `Rs.${parseFloat(amount || 0).toFixed(2)}`
}

/**
 * Format date for export
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
