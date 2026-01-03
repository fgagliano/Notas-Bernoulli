"use server";

import { createClient } from "@supabase/supabase-js";

function sbAdmin() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function assertAdmin(formData: FormData) {
  const secret = String(formData.get("admin_secret") || "");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    throw new Error("Código de admin inválido.");
  }
}

export async function upsertAlunoAno(formData: FormData) {
  assertAdmin(formData);

  const aluno = String(formData.get("aluno") || "").trim();
  const ano = Number(formData.get("ano"));
  const serie = String(formData.get("serie") || "").trim();

  if (!aluno || !Number.isFinite(ano) || !serie) {
    throw new Error("Preencha Aluno, Ano e Série.");
  }

  const supabase = sbAdmin();

  const { error } = await supabase
    .from("aluno_ano")
    .upsert({ aluno, ano, serie }, { onConflict: "aluno,ano" });

  if (error) throw new Error(error.message);
}

export async function deleteAlunoAno(formData: FormData) {
  assertAdmin(formData);

  const aluno = String(formData.get("aluno") || "").trim();
  const ano = Number(formData.get("ano"));

  if (!aluno || !Number.isFinite(ano)) {
    throw new Error("Aluno/Ano inválidos.");
  }

  const supabase = sbAdmin();
  const { error } = await supabase.from("aluno_ano").delete().eq("aluno", aluno).eq("ano", ano);
  if (error) throw new Error(error.message);
}

export async function listAlunoAno() {
  const supabase = sbAdmin();
  const { data, error } = await supabase
    .from("aluno_ano")
    .select("aluno, ano, serie")
    .order("ano", { ascending: false })
    .order("aluno", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
