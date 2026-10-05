import React from 'react';
import { ChevronLeft } from 'lucide-react';
import privacyPolicy from '../../docs/store/privacy-policy.md?raw';
import faq from '../../docs/store/faq.md?raw';
import { fillPlaceholders } from '../data/appInfo';

export type InfoPageKind = 'privacy' | 'faq';

const pages: Record<InfoPageKind, { title: string; markdown: string }> = {
  privacy: { title: 'Privacy Policy', markdown: privacyPolicy },
  faq: { title: 'Help & FAQ', markdown: faq },
};

// **bold** inside a line.
const inline = (text: string, key: string) =>
  text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${key}-${i}`} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${key}-${i}`}>{part}</React.Fragment>,
  );

// Renders the small subset of Markdown the store documents use: headings, paragraphs, two-level bullet lists and
// bold text. A line starting with ** begins a new line within a paragraph (e.g. "**Question?**" then its answer).
const renderMarkdown = (markdown: string) => {
  const blocks = fillPlaceholders(markdown).split(/\n\s*\n/);
  return blocks.map((block, b) => {
    const lines = block.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return null;
    const first = lines[0];
    if (first.startsWith('# ')) return null; // the page title is in the header
    if (first.startsWith('## ')) {
      return <h2 key={b} className="text-base font-semibold text-gray-900 pt-3">{first.slice(3)}</h2>;
    }
    if (lines.every(l => /^\s*- /.test(l) || /^\s{2,}\S/.test(l))) {
      const items: { text: string; children: string[] }[] = [];
      for (const l of lines) {
        if (/^- /.test(l)) items.push({ text: l.slice(2), children: [] });
        else if (/^\s+- /.test(l)) items[items.length - 1]?.children.push(l.trim().slice(2));
        else if (items.length) {
          const last = items[items.length - 1];
          if (last.children.length) last.children[last.children.length - 1] += ` ${l.trim()}`;
          else last.text += ` ${l.trim()}`;
        }
      }
      return (
        <ul key={b} className="list-disc pl-5 space-y-1.5">
          {items.map((item, i) => (
            <li key={i}>
              {inline(item.text, `${b}-${i}`)}
              {item.children.length > 0 && (
                <ul className="list-[circle] pl-5 mt-1 space-y-1">
                  {item.children.map((c, j) => <li key={j}>{inline(c, `${b}-${i}-${j}`)}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      );
    }
    const paragraphLines: string[] = [];
    for (const l of lines) {
      if (l.startsWith('**') || paragraphLines.length === 0) paragraphLines.push(l.trim());
      else paragraphLines[paragraphLines.length - 1] += ` ${l.trim()}`;
    }
    return (
      <p key={b}>
        {paragraphLines.map((l, i) => (
          <React.Fragment key={i}>{i > 0 && <br />}{inline(l, `${b}-${i}`)}</React.Fragment>
        ))}
      </p>
    );
  });
};

// The privacy policy and FAQ, shown inside the app (the same text as docs/store/, so it works offline).
const InfoPage: React.FC<{ kind: InfoPageKind; onClose: () => void }> = ({ kind, onClose }) => {
  const page = pages[kind];
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col max-w-md mx-auto lg:max-w-lg xl:max-w-xl">
      <div className="flex items-center justify-between px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="flex items-center gap-1 text-gray-600 hover:text-gray-900">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>
        <h2 className="text-base font-semibold text-gray-900">{page.title}</h2>
        <div className="w-16" />
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-3 text-sm text-gray-700 leading-relaxed break-words">
        {renderMarkdown(page.markdown)}
      </div>
    </div>
  );
};

export default InfoPage;
