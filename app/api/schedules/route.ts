import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function getDaysUntilDue(dueDate: string) {
  const today = new Date();
  const due = new Date(dueDate);
  today.setUTCHours(0,0,0,0);
  due.setUTCHours(0,0,0,0);
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET() {
  const now = new Date();
  now.setUTCHours(0,0,0,0);
  const schedules = await prisma.preventiveSchedule.findMany();
  const data = schedules.map(s => {
    const daysUntilDue = getDaysUntilDue(s.nextDueDate.toISOString());
    const due = daysUntilDue <= 0 && s.active;
    return {
      ...s,
      daysUntilDue,
      due,
    };
  });
  return NextResponse.json({ success: true, data });
}
