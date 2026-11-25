import { createAndroidApi } from "./android.js";

export const nativeApi = typeof window !== "undefined" ? window.moread : null;

export const api = nativeApi || createAndroidApi();

export const isAndroid = !nativeApi && typeof window !== "undefined";
