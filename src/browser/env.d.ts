declare module '*.wasm?url' {
  const url: string;
  export default url;
}

interface ImportMeta {
  glob(pattern: string, options: { query: string; import: string; eager: true }): Record<string, unknown>;
}
