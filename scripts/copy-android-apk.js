'use strict';

/** Copy the signed Android release APK into release/ with its version name. */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gradle = fs.readFileSync(path.join(root, 'android', 'app', 'build.gradle'), 'utf8');
const match = gradle.match(/versionName\s+["']([^"']+)["']/);
if (!match) throw new Error('无法从 android/app/build.gradle 读取 versionName');
const version = match[1];

const source = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(source)) throw new Error(`未找到 release APK：${source}`);
const target = path.join(root, 'release', `MoRead-Android-${version}.apk`);
fs.copyFileSync(source, target);
console.log(`已复制 ${path.relative(root, target)}（${(fs.statSync(target).size / 1024 / 1024).toFixed(2)} MB）`);