import { NextResponse } from "next/server";
import { supabaseServer } from "../../../lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 20), 200);

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("notas_lancamentos")
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();

  const aluno = String(body?.aluno || "").trim();
  const serie = String(body?.serie || "").trim();
  const etapa = Number(body?.etapa);
  const disciplina = String(body?.disciplina || "").trim();
  const avaliacao = String(body?.avaliacao || "").trim();

  const valor_max = Number(body?.valor_max);
  const valor_media =
    body?.valor_media === undefined || body?.valor_media === null
      ? Number((valor_max * 0.6).toFixed(2))
      : Number(body?.valor_media);

  const nota = body?.nota === null || body?.nota === undefined ? null : Number(body?.nota);

  if (!aluno || !serie || !disciplina || !avaliacao) {
    return NextResponse.json({ error: "Campos obrigatórios: aluno, serie, disciplina, avaliacao" }, { status: 400 });
  }
  if (![1, 2, 3].includes(etapa)) {
    return NextResponse.json({ error: "Etapa inválida (1,2,3)" }, { status: 400 });
  }
  if (!Number.isFinite(valor_max) || valor_max <= 0) {
    return NextResponse.json({ error: "valor_max inválido" }, { status: 400 });
  }
  if (!Number.isFinite(valor_media) || valor_media < 0) {
    return NextResponse.json({ error: "valor_media inválido" }, { status: 400 });
  }
  if (nota !== null) {
    if (!Number.isFinite(nota)) return NextResponse.json({ error: "nota inválida" }, { status: 400 });
    if (nota < 0 || nota > valor_max) return NextResponse.json({ error: "nota fora do intervalo" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("notas_lancamentos")
    .insert({ aluno, serie, etapa, disciplina, avaliacao, valor_max, valor_media, nota })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
