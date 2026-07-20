export const REFERENCE_FILE_ACCEPT =
  ".txt,.md,.json,.csv,text/plain,text/markdown,application/json,text/csv";

export const MAX_REFERENCE_FILES = 5;
export const MAX_REFERENCE_TOTAL_CHARS = 80000;

const ALLOWED_EXTENSIONS = new Set([".txt", ".md", ".json", ".csv"]);

export interface ReferenceFile {
  name: string;
  content: string;
  size: number;
}

export type ReferenceFileLike = Pick<File, "name" | "type">;

export type AddReferenceFilesResult =
  | { ok: true; files: ReferenceFile[] }
  | { ok: false; files: ReferenceFile[]; error: string };

function getFileExtension(name: unknown): string {
  const value = String(name ?? "");
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex <= 0) return "";
  return value.slice(dotIndex).toLowerCase();
}

/** 按扩展名/MIME 判断是否允许作为参考文件（非结构类型守卫）。 */
export function isReferenceFile(file: unknown): boolean {
  if (!file || typeof file !== "object") return false;

  const fileLike = file as ReferenceFileLike;
  const extension = getFileExtension(fileLike.name);
  if (ALLOWED_EXTENSIONS.has(extension)) return true;

  const mime = String(fileLike.type ?? "").toLowerCase();
  if (mime.startsWith("text/")) return true;
  if (mime === "application/json") return true;

  return false;
}

export function readReferenceFile(file: File | ReferenceFileLike): Promise<ReferenceFile> {
  return new Promise((resolve, reject) => {
    if (!isReferenceFile(file)) {
      reject(new Error(`不支持 ${String(file?.name || "该")} 格式`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      resolve({
        name: String(file.name ?? "未命名"),
        content,
        size: content.length
      });
    };
    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
    reader.readAsText(file as unknown as Blob);
  });
}

function getTotalChars(files: ReferenceFile[]): number {
  return files.reduce((sum, file) => sum + file.size, 0);
}

export async function addReferenceFiles(
  existing: ReferenceFile[] | unknown,
  incomingFiles: FileList | File[] | Iterable<File | null | undefined> | null | undefined
): Promise<AddReferenceFilesResult> {
  const current = Array.isArray(existing) ? [...existing] : [];
  const incoming = Array.from(incomingFiles ?? []).filter(Boolean) as File[];

  if (!incoming.length) {
    return { ok: true, files: current };
  }

  if (current.length + incoming.length > MAX_REFERENCE_FILES) {
    return {
      ok: false,
      files: current,
      error: `最多附带 ${MAX_REFERENCE_FILES} 个参考文件`
    };
  }

  const unsupported = incoming.find((file) => !isReferenceFile(file));
  if (unsupported) {
    return {
      ok: false,
      files: current,
      error: `不支持 ${unsupported.name} 格式`
    };
  }

  let next = [...current];

  for (const file of incoming) {
    let parsed: ReferenceFile;
    try {
      parsed = await readReferenceFile(file);
    } catch (error) {
      return {
        ok: false,
        files: current,
        error: error instanceof Error ? error.message : "读取参考文件失败"
      };
    }

    const existingIndex = next.findIndex((item) => item.name === parsed.name);
    if (existingIndex >= 0) {
      next[existingIndex] = parsed;
    } else {
      next.push(parsed);
    }

    if (getTotalChars(next) > MAX_REFERENCE_TOTAL_CHARS) {
      return {
        ok: false,
        files: current,
        error: "参考文件总大小不能超过 80 KB"
      };
    }
  }

  return { ok: true, files: next };
}

export function formatUserMessageWithReferences(
  prompt: unknown,
  references: ReferenceFile[] = []
): string {
  const trimmed = String(prompt ?? "").trim();
  if (!references.length) return trimmed;

  const names = references.map((file) => file.name).join("、");
  return `${trimmed}\n\n📎 参考：${names}`;
}
