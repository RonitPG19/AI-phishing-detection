import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const rootDir = resolve(process.cwd())
const chromiumDistDir = resolve(rootDir, "dist")
const firefoxDistDir = resolve(rootDir, "dist-firefox")
const manifestPath = resolve(firefoxDistDir, "manifest.json")

if (!existsSync(chromiumDistDir)) {
  throw new Error("Build output not found. Run `npm run build` before `npm run build:firefox`.")
}

rmSync(firefoxDistDir, { recursive: true, force: true })
mkdirSync(firefoxDistDir, { recursive: true })
cpSync(chromiumDistDir, firefoxDistDir, { recursive: true })

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"))

manifest.background = {
  scripts: ["service-worker-loader.js"],
  type: "module"
}

manifest.web_accessible_resources = (manifest.web_accessible_resources || []).map((entry) => {
  const { use_dynamic_url, ...rest } = entry
  return rest
})

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}
`, "utf8")
console.log("Prepared Firefox build at dist-firefox/")
