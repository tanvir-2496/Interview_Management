"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

function ToolButton({
  label,
  active,
  onClick
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`border px-2 py-1 text-xs ${active ? "border-brand-700 bg-brand-700 text-white" : "border-slate-300 bg-white text-slate-700"}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export default function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "rich-editor-content min-h-[160px] rounded-b-md border border-t-0 border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none"
      }
    },
    onUpdate: ({ editor: nextEditor }) => onChange(nextEditor.getHTML())
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "<p></p>", false);
    }
  }, [editor, value]);

  if (!editor) {
    return <div className="rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">Loading editor...</div>;
  }

  return (
    <div className="rich-editor">
      <div className="flex flex-wrap gap-1 rounded-t-md border border-slate-300 bg-slate-50 px-2 py-2">
        <ToolButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
        <ToolButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
        <ToolButton label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <ToolButton label="Bullet" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
        <ToolButton label="Number" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
        <ToolButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
        <ToolButton label="Undo" onClick={() => editor.chain().focus().undo().run()} />
        <ToolButton label="Redo" onClick={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
