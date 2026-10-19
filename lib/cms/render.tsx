/**
 * হালকা মার্কডাউন-সদৃশ রেন্ডারার — CMS পেজের বাংলা কনটেন্টের জন্য।
 * সমর্থিত: ## / ### হেডিং, - বুলেট, ১. নম্বর লিস্ট, **bold**, খালি লাইন = প্যারা।
 * HTML ইনপুট এস্কেপ হয় (XSS নয়)।
 */

import type { ReactNode } from "react";

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={`${keyPrefix}-${index}`}>{part}</span>;
  });
}

export function renderCmsBody(body: string): ReactNode {
  const lines = body.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${key++}`}>
        {list.map((item, index) => (
          <li key={index}>{renderInline(item, `li-${key}-${index}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(<p key={`p-${key++}`}>{renderInline(paragraph.join(" "), `p-${key}`)}</p>);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      flushParagraph();
      blocks.push(<h3 key={`h3-${key++}`}>{renderInline(line.slice(4), `h3-${key}`)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList();
      flushParagraph();
      blocks.push(<h2 key={`h2-${key++}`}>{renderInline(line.slice(3), `h2-${key}`)}</h2>);
    } else if (/^[-•] /.test(line.trim())) {
      flushParagraph();
      list.push(line.trim().slice(2));
    } else if (/^\d+[.)] /.test(line.trim())) {
      flushParagraph();
      list.push(line.trim().replace(/^\d+[.)] /, ""));
    } else {
      flushList();
      paragraph.push(line.trim());
    }
  }
  flushList();
  flushParagraph();

  return <div className="prose">{blocks}</div>;
}
