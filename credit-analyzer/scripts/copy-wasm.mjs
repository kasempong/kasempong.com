// Copy sql.js WASM and pdfjs worker to public directory for client-side use
import { copyFileSync, mkdirSync, existsSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")

function copyIfExists(src, dest) {
  if (existsSync(src)) {
    mkdirSync(dirname(dest), { recursive: true })
    copyFileSync(src, dest)
    console.log(`Copied: ${dest}`)
  } else {
    console.warn(`Not found (skipping): ${src}`)
  }
}

// sql.js WASM file
copyIfExists(
  join(root, "node_modules/sql.js/dist/sql-wasm.wasm"),
  join(root, "public/sql.js/sql-wasm.wasm")
)

// pdfjs worker
const pdfjsWorkerPaths = [
  join(root, "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
  join(root, "node_modules/pdfjs-dist/build/pdf.worker.mjs"),
]

for (const src of pdfjsWorkerPaths) {
  if (existsSync(src)) {
    copyIfExists(src, join(root, "public/pdf.worker.min.mjs"))
    break
  }
}
