import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../lib/supabaseServer";

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("alunos")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const body = await req.json();
  const nome = String(body?.nome || "").trim();
  const serie = String(body?.serie || "").trim();

  if (!nome || !serie) {
    return NextResponse.json({ error: "nome e serie são obrigatórios" }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("alunos")
    .insert({ nome, serie })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
