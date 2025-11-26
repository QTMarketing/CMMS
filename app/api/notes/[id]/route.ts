import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  try {
    const noteId = parseInt(id, 10);
    if (isNaN(noteId)) {
      return NextResponse.json({ success: false, error: "Invalid note id." }, { status: 400 });
    }
    // Try to find the note first
    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) {
      return NextResponse.json(
        { success: false, error: "Note not found." },
        { status: 404 }
      );
    }
    await prisma.note.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
