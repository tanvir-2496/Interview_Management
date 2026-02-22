"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function RichEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  });

  return <div className="card"><EditorContent editor={editor} /></div>;
}
