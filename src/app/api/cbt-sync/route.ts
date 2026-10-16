import { saveAnswerRealtime } from "@/app/cbt/actions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { token, answers } = await req.json();
    if (!token) return NextResponse.json({ success: false });

    await saveAnswerRealtime(token, answers);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
