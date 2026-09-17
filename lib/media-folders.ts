/**
 * Media library folders — shared by the studio UI and the upload routes so
 * the two can never drift apart. Isomorphic (no server-only imports).
 */
export const MEDIA_FOLDERS = [
  { id: "media/images", label: "Images" },
  { id: "media/videos", label: "Videos & audio" },
  { id: "media/public", label: "Public assets" },
  { id: "events", label: "Events" },
  { id: "speakers", label: "Speakers" },
  { id: "posts", label: "Journal" },
  { id: "owner", label: "Owner section" },
  { id: "avatars", label: "Avatars" },
  { id: "media/documents", label: "Documents" },
] as const;

export const MEDIA_FOLDER_IDS = MEDIA_FOLDERS.map((f) => f.id) as string[];

export const ALLOWED_MEDIA_FOLDERS = new Set<string>(MEDIA_FOLDER_IDS);

export function isAllowedFolder(folder: string): boolean {
  return ALLOWED_MEDIA_FOLDERS.has(folder);
}

/** Best default folder for a file type. */
export function defaultFolderForKind(kind: "image" | "video" | "audio" | "document"): string {
  if (kind === "document") return "media/documents";
  if (kind === "image") return "media/images";
  return "media/videos";
}

export const FOLDER_ACCEPT = "image/*,video/*,audio/*,.pdf,.txt,.csv";
