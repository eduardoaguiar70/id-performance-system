import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MES = /^\d{4}-\d{2}$/;

function tabelaAusente(error: { code?: string; message: string }) {
  return error.code === "42P01" || error.code === "PGRST205" || /metas_faturamento/.test(error.message);
}

const respostaSemTabela = () =>
  NextResponse.json(
    { message: "Tabela metas_faturamento não existe. Rode metas_faturamento_migration.sql no Supabase." },
    { status: 501 }
  );

// GET /api/ecommerce/metas?conta_id=...&mes=2026-10
export async function GET(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const contaId = req.nextUrl.searchParams.get("conta_id");
  const mes = req.nextUrl.searchParams.get("mes");
  if (!contaId || !mes || !MES.test(mes)) {
    return NextResponse.json({ message: "Informe conta_id e mes (AAAA-MM)." }, { status: 400 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("metas_faturamento")
    .select("valor")
    .eq("conta_id", contaId)
    .eq("mes", `${mes}-01`)
    .maybeSingle();

  if (error) return tabelaAusente(error) ? respostaSemTabela() : NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ valor: data ? Number(data.valor) : null });
}

// PUT { conta_id, mes: "2026-10", valor: 150000 }
export async function PUT(req: NextRequest) {
  if (!req.cookies.get("sb-auth-token")?.value) {
    return NextResponse.json({ message: "Sessão expirada." }, { status: 401 });
  }
  const { conta_id, mes, valor } = (await req.json().catch(() => ({}))) as { conta_id?: string; mes?: string; valor?: number };
  if (!conta_id || !mes || !MES.test(mes) || typeof valor !== "number" || !Number.isFinite(valor) || valor < 0) {
    return NextResponse.json({ message: "Informe conta_id, mes (AAAA-MM) e um valor maior ou igual a zero." }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin()
    .from("metas_faturamento")
    .upsert(
      { conta_id, mes: `${mes}-01`, valor, atualizado_em: new Date().toISOString() },
      { onConflict: "conta_id,mes" }
    );

  if (error) return tabelaAusente(error) ? respostaSemTabela() : NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
