import { NextRequest, NextResponse } from "next/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;


export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdfParse(buffer);

    return NextResponse.json({ text: data.text }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Erro ao processar arquivo";
    console.error("Erro ao analisar o PDF:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
