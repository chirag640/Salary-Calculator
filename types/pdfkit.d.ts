declare module 'pdfkit' {
  import { Writable } from 'stream'
  class PDFDocument extends Writable {
    constructor(options?: any)
    fontSize(size: number): PDFDocument
    text(text: string, x?: number, y?: number, options?: any): PDFDocument
    addPage(options?: any): PDFDocument
    on(event: 'data' | 'end' | string, listener: (...args: any[]) => void): this
    pipe(dest: NodeJS.WritableStream): this
    end(): void
  }
  export = PDFDocument
}
