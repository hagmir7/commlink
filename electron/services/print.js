async function assertKnownPrinter(webContents, printerName) {
  if (!printerName) return
  const printers = await webContents.getPrintersAsync()
  if (!printers.some((p) => p.name === printerName)) {
    throw new Error('Unknown printer')
  }
}

async function printPdf(filePath, printerName, { duplex = false } = {}) {
  if (process.platform === 'win32') {
    const { print } = require('pdf-to-printer')
    // Always send the value explicitly so the printer's default is never used
    const opts = { sides: duplex ? 'duplexlong' : 'simplex' }
    if (printerName) opts.printer = printerName
    await print(filePath, opts)
  } else {
    const { print } = require('unix-print')
    const sides = duplex ? 'two-sided-long-edge' : 'one-sided'
    await print(filePath, printerName || undefined, [`-o sides=${sides}`])
  }
}

module.exports = { assertKnownPrinter, printPdf }
