import { Fragment } from "react";

type Block =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "bullets"; items: string[] }
  | { kind: "steps"; items: string[] };

const bulletPattern = /^\s*[-•*]\s+/;
const stepPattern = /^\s*\d+[.)]\s+/;
const headingPattern = /^\s*#{1,6}\s+/;

function toBlocks(text: string) {
  const blocks: Block[] = [];
  const push = (kind: Block["kind"], value: string) => {
    const last = blocks[blocks.length - 1];
    if (last && last.kind === kind) {
      if (last.kind === "paragraph") last.lines.push(value);
      else last.items.push(value);
      return;
    }
    blocks.push(kind === "paragraph" ? { kind, lines: [value] } : { kind, items: [value] });
  };

  let breakBefore = false;
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      breakBefore = true;
      continue;
    }
    if (bulletPattern.test(line)) push("bullets", line.replace(bulletPattern, ""));
    else if (stepPattern.test(line)) push("steps", line.replace(stepPattern, ""));
    else if (headingPattern.test(line)) blocks.push({ kind: "paragraph", lines: [`**${line.replace(headingPattern, "").replace(/\*\*/g, "")}**`] });
    else if (breakBefore) blocks.push({ kind: "paragraph", lines: [line.trim()] });
    else push("paragraph", line.trim());
    breakBefore = false;
  }
  return blocks;
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={index} className="font-semibold text-ink">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        )
      )}
    </>
  );
}

export function MessageText({ text }: { text: string }) {
  return (
    <div className="space-y-2 break-words">
      {toBlocks(text).map((block, index) => {
        if (block.kind === "bullets") {
          return (
            <ul key={index} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sun-500" />
                  <span className="min-w-0">
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.kind === "steps") {
          return (
            <ol key={index} className="space-y-1.5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-start gap-2">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sun-100 text-[11px] font-bold text-sun-800">
                    {itemIndex + 1}
                  </span>
                  <span className="min-w-0">
                    <Inline text={item} />
                  </span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                <Inline text={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
