#!/usr/bin/env node
// DrillHarmony · создание и обновление проектов Android и iOS.
// Запуск из папки app:  npm run setup
// Нужны: Node.js 22+, для Android — Android Studio (JDK 21 и Android SDK), для iOS — macOS с Xcode 26+.
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(APP, "package.json"), "utf8"));
const run = (cmd, soft = false) => {
  console.log("\n> " + cmd);
  try { execSync(cmd, { cwd: APP, stdio: "inherit", shell: true }); return true; }
  catch (e) { if (soft) { console.warn("  пропущено: " + cmd); return false; } throw e; }
};
const patch = (file, fn) => {
  const p = join(APP, file);
  if (!existsSync(p)) return;
  const a = readFileSync(p, "utf8"), b = fn(a);
  if (a !== b) { writeFileSync(p, b); console.log("  обновлён " + file); }
};

if (!existsSync(join(APP, "www", "index.html"))) {
  console.error("Нет www/index.html. Соберите веб-часть: npm run www (нужен Python 3 и esbuild)");
  process.exit(1);
}
if (!existsSync(join(APP, "node_modules", "@capacitor", "cli"))) run("npm install");

if (!existsSync(join(APP, "android"))) run("npx cap add android");
const mac = process.platform === "darwin";
if (!existsSync(join(APP, "ios"))) {
  if (mac) run("npx cap add ios");
  else console.log("\niOS-проект создаётся на Mac: там выполните npm run setup ещё раз.");
}

// иконки и заставки из resources/
run(pkg.scripts.assets, true);
run("npx cap sync");

// номер версии из package.json: versionName / versionCode для Android, MARKETING_VERSION для iOS
const [ma, mi, pa] = pkg.version.split(".").map(Number);
const code = ma * 10000 + mi * 100 + pa;
patch("android/app/build.gradle", (t) => t
  .replace(/versionCode \d+/, "versionCode " + code)
  .replace(/versionName "[^"]*"/, `versionName "${pkg.version}"`));
patch("ios/App/App.xcodeproj/project.pbxproj", (t) => t
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${pkg.version};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${code};`));

// iOS: русский язык интерфейса, без шифрования (для экспортной анкеты App Store), только портрет на iPhone
patch("ios/App/App/Info.plist", (t) => {
  t = t.replace(/(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)[^<]*(<\/string>)/, "$1ru$2");
  if (!t.includes("ITSAppUsesNonExemptEncryption"))
    t = t.replace(/<dict>/, "<dict>\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>");
  t = t.replace(/(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/,
    "$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2");
  return t;
});

// Android: только портрет на телефоне, без резервного копирования в облако Google (данные остаются на устройстве)
patch("android/app/src/main/AndroidManifest.xml", (t) => t
  .replace('android:allowBackup="true"', 'android:allowBackup="false"')
  .replace(/(<activity\b(?![^>]*screenOrientation))/, '$1\n            android:screenOrientation="portrait"'));

console.log(`
Готово. Версия ${pkg.version} (${code}).
  Android: npx cap open android  → Run, либо Build → Generate Signed App Bundle
  iOS:     npx cap open ios      → выбрать команду разработчика в Signing → Run / Archive
`);
