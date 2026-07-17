"use client";

// Rich text editor (Tiptap) for descriptions — formatting, links, code
// and screenshots pasted/dropped straight into the text (uploaded via
// the files API, served back through the authenticated route).

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Paperclip,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Undo2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { uploadWithProgress } from "@/lib/upload";
import { cn } from "@/lib/utils";

/** Upload with a live progress toast so big files never feel stuck. */
async function uploadFile(file: File): Promise<string> {
  const toastId = toast.loading(`Uploading ${file.name}… 0%`);
  try {
    const result = await uploadWithProgress(file, {}, (percent) =>
      toast.loading(
        percent < 100
          ? `Uploading ${file.name}… ${percent}%`
          : `Processing ${file.name}…`,
        { id: toastId }
      )
    );
    toast.success("Uploaded.", { id: toastId, description: file.name });
    return `/api/v1/files/${result.id}`;
  } catch (err) {
    toast.error(`${file.name}: ${(err as Error).message}`, { id: toastId });
    throw err;
  }
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-40",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write something…",
  minHeight = "min-h-44",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** tailwind min-height class for the writing area */
  minHeight?: string;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  // dragenter/leave fire for children too — count to avoid flicker
  const dragDepth = useRef(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: `rich-text ${minHeight} max-w-none px-4 py-3 text-sm leading-relaxed outline-none`,
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []);
        if (files.length > 0) {
          files.forEach(insertFile);
          return true;
        }
        return false;
      },
      handleDrop: (_view, event) => {
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (files.length > 0) {
          event.preventDefault();
          files.forEach(insertFile); // images embed, zips/docs become links
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML());
    },
  });

  async function insertFile(file: File) {
    if (!editor) return;
    setUploading(true);
    try {
      const src = await uploadFile(file);
      if (file.type.startsWith("image/")) {
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      } else {
        // non-image files (zip, pdf, …) become a download link
        editor
          .chain()
          .focus()
          .insertContent(
            `<a href="${src}" target="_blank" rel="noopener noreferrer">${file.name}</a>&nbsp;`
          )
          .run();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function setLink(editor: Editor) {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "" || url === "https://") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  if (!editor) {
    return <div className="min-h-44 rounded-xl bg-muted/40" />;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-muted/40 ring-border transition-shadow focus-within:ring-1",
        dragging && "ring-2 ring-primary/60"
      )}
      onDragEnter={(e) => {
        e.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        dragDepth.current = 0;
        setDragging(false);
        // ProseMirror's handleDrop already claimed drops inside the text area
        if (e.defaultPrevented) return;
        const files = Array.from(e.dataTransfer?.files ?? []);
        if (files.length > 0) {
          e.preventDefault();
          files.forEach(insertFile);
        }
      }}
    >
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-primary/5 backdrop-blur-[1px]">
          <span className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg">
            <UploadCloud className="size-4" />
            Drop files to attach
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-2 py-1.5">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton
          label="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-3.5" />
        </ToolbarButton>

        <span className="mx-1 h-4 w-px bg-border" />

        <ToolbarButton
          label="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Code block (HTML, snippets…)"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link")}
          onClick={() => setLink(editor)}
        >
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Insert screenshot / image"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
        </ToolbarButton>
        <ToolbarButton
          label="Attach any file (zip, pdf, docs…)"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="size-3.5" />
        </ToolbarButton>

        <span className="ml-auto flex items-center gap-0.5">
          <ToolbarButton
            label="Undo"
            disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 className="size-3.5" />
          </ToolbarButton>
          <ToolbarButton
            label="Redo"
            disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 className="size-3.5" />
          </ToolbarButton>
        </span>
      </div>

      <EditorContent editor={editor} />

      <div className="px-2 pb-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border/80 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/[0.03] hover:text-foreground"
        >
          <UploadCloud className="size-3.5" />
          <span>
            <span className="font-medium">Drag &amp; drop</span> files or
            screenshots here, or click to browse
          </span>
        </button>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertFile(file);
          e.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(e) => {
          Array.from(e.target.files ?? []).forEach(insertFile);
          e.target.value = "";
        }}
      />
    </div>
  );
}
