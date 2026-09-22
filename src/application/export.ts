import initSqlJs from "sql.js";
import { zipSync } from "fflate";
import type { VocabularyEntry } from "../domain/model";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";

export type ExportFormat = "txt" | "csv" | "apkg";

export interface ExportOptions {
  format: ExportFormat;
  delimiter: string;
  includeExamples: boolean;
}

export function serializeEntries(
  entries: VocabularyEntry[],
  delimiter: string,
  includeExamples: boolean,
): string {
  const header = includeExamples
    ? ["Word", "Translation", "Example"]
    : ["Word", "Translation"];
  const rows = entries.map((entry) =>
    includeExamples
      ? [entry.original, entry.translation, entry.context]
      : [entry.original, entry.translation],
  );
  return [header, ...rows]
    .map((row) =>
      row.map((value) => escapeField(value, delimiter)).join(delimiter),
    )
    .join("\n");
}

export function parseSerializedEntries(
  text: string,
  delimiter: string,
  template: VocabularyEntry[],
): VocabularyEntry[] {
  return text
    .split(/\r?\n/)
    .slice(1)
    .map((line, index) => parseLine(line, delimiter, template[index]))
    .filter((entry): entry is VocabularyEntry => Boolean(entry));
}

function parseLine(
  line: string,
  delimiter: string,
  source?: VocabularyEntry,
): VocabularyEntry | undefined {
  if (!line.trim()) return undefined;
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === delimiter && !quoted) {
      values.push(value);
      value = "";
    } else value += character;
  }
  values.push(value);
  if (!values[0]?.trim() || !values[1]?.trim()) return undefined;
  return {
    id: source?.id ?? `export-${indexOfValue(values[0])}`,
    original: values[0],
    translation: values[1],
    context: values[2] ?? "",
    sourceLanguage: source?.sourceLanguage ?? "",
    targetLanguage: source?.targetLanguage ?? "",
    url: source?.url ?? "https://memorize.local/export",
    translatedCount: source?.translatedCount ?? 1,
    createdAt: source?.createdAt ?? new Date().toISOString(),
    updatedAt: source?.updatedAt ?? new Date().toISOString(),
  };
}

function indexOfValue(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 40) || "entry"
  );
}

function escapeField(value: string, delimiter: string): string {
  if (!/["\r\n]/.test(value) && !value.includes(delimiter)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

export async function createAnkiPackage(
  entries: VocabularyEntry[],
  includeExamples: boolean,
): Promise<Uint8Array> {
  const SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });
  const db = new SQL.Database();
  const now = Math.floor(Date.now() / 1000);
  const modelId = now * 1000 + 1;
  const deckId = now * 1000 + 2;
  const fields = includeExamples
    ? ["Word", "Translation", "Example"]
    : ["Word", "Translation"];
  const templateBack = includeExamples
    ? "{{Translation}}<br>{{Example}}"
    : "{{Translation}}";
  const model = JSON.stringify({
    [modelId]: {
      id: modelId,
      name: "Memorize vocabulary",
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: deckId,
      tmpls: [
        {
          name: "Card 1",
          ord: 0,
          qfmt: "{{Word}}",
          afmt: `{{FrontSide}}<hr id=answer>${templateBack}`,
        },
      ],
      flds: fields.map((name, ord) => ({
        name,
        ord,
        sticky: false,
        rtl: false,
        font: "Arial",
        size: 20,
      })),
      css: ".card { font-family: Arial; font-size: 20px; text-align: center; color: black; background: white; }",
      latexPre: "",
      latexPost: "",
      latexsvg: false,
      req: [[0, "all", [0]]],
      tags: [],
      vers: [],
    },
  });
  const decks = JSON.stringify({
    [deckId]: {
      id: deckId,
      name: "Memorize",
      desc: "Exported from Memorize",
      dyn: 0,
      extendNew: 10,
      extendRev: 50,
      conf: 1,
      collapsed: false,
      browserCollapsed: false,
    },
  });
  db.run(
    "CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null)",
  );
  db.run(
    "CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null)",
  );
  db.run(
    "CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null)",
  );
  db.run("INSERT INTO col VALUES (?, ?, ?, 11, 0, 0, -1, 0, ?, ?, ?, ?, ?)", [
    1,
    now,
    now,
    JSON.stringify({}),
    model,
    decks,
    JSON.stringify({}),
    JSON.stringify([]),
  ]);
  entries.forEach((entry, index) => {
    const noteId = now * 1_000_000 + index + 1;
    const values = includeExamples
      ? [entry.original, entry.translation, entry.context]
      : [entry.original, entry.translation];
    const flds = values.join("\x1f");
    db.run("INSERT INTO notes VALUES (?, ?, ?, ?, -1, '', ?, ?, 0, 0, '')", [
      noteId,
      `memorize-${noteId}`,
      modelId,
      now,
      flds,
      entry.original,
    ]);
    db.run(
      "INSERT INTO cards VALUES (?, ?, ?, 0, ?, -1, 0, 0, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, '')",
      [noteId, noteId, deckId, now, index + 1],
    );
  });
  const collection = db.export();
  db.close();
  return zipSync({
    "collection.anki2": collection,
    media: new TextEncoder().encode("{}"),
  });
}

export function downloadBlob(
  data: BlobPart | Uint8Array,
  filename: string,
  type: string,
): void {
  const url = URL.createObjectURL(new Blob([data as BlobPart], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
