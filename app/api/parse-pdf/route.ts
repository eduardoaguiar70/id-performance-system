import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdf(buffer);

    return NextResponse.json({ text: data.text }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao analisar o PDF:", error);
    return NextResponse.json({ error: error.message || "Erro ao processar arquivo" }, { status: 500 });
  }
}
