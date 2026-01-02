import { NextResponse } from "next/server";
import { supabaseServer } from "../../../../../lib/supabaseServer";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!id) return NextResponse.json({ error: "id inválido" }, { status: 400 });

  const sb = supabaseServer();
  const { data, error } = await sb
    .from("alunos")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
