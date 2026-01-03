"use server";

import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

function sbAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    redirect(
      "/admin?err=" +
        encodeURIComponent(
          "Configuração inválida: variáveis do Supabase não encontradas no Vercel."
        )
    );
  }

  return createClient(url!, key!, {
    auth: { persistSession: false },
  });
}

function assertAdmin(formData: FormData) {
  const secret = String(formData.get("admin_secret") || "").trim();
  const expected = process.env.ADMIN_SECRET;

  if (!expected) {
    redirect(
      "/admin?err=" +
        encodeURIComponent("ADMIN_SECRET não está configurado no Vercel.")
    );
  }

  if (!secret) {
    redirect(
      "/admin?err=" +
        encodeURIComponent(
          "Informe o código de admin para salvar ou excluir vínculos."
        )
    );
  }

  if (secret !== expected) {
    redirect(
      "/admin?err=" +
        encodeURIComponent("Código de admin incorreto.")
    );
  }
}

export async function upsertAlunoAno(formData: FormData) {
  assertAdmin(formData);

  const aluno = String(formData.get("aluno") || "").trim();
  const ano = Number(formData.get("ano"));
  const serie = String(formData.get("serie") || "").trim();

  if (!aluno || !Number.isFinite(ano) || !serie) {
    redirect(
      "/admin?err=" +
        encodeURIComponent("Preencha corretamente Aluno, Ano e Série.")
    );
  }

  const supabase = sbAdmin();

  const { error } = await supabase
    .from("aluno_ano")
    .upsert(
      { aluno, ano, serie },
      { onConflict: "aluno,ano" }
    );

  if (error) {
    redirect(
      "/admin?err=" + encodeURIComponent(error.message)
    );
  }

  revalidatePath("/admin");
  redirect("/admin?ok=1");
}

export async function deleteAlunoAno(formData: FormData) {
  assertAdmin(formData);

  const aluno = String(formData.get("aluno") || "").trim();
  const ano = Number(formData.get("ano"));

  if (!aluno || !Number.isFinite(ano)) {
    redirect(
      "/admin?err=" +
        encodeURIComponent("Aluno ou Ano inválidos.")
    );
  }

  const supabase = sbAdmin();

  const { error } = await supabase
    .from("aluno_ano")
    .delete()
    .eq("aluno", aluno)
    .eq("ano", ano);

  if (error) {
    redirect(
      "/admin?err=" + encodeURIComponent(error.message)
    );
  }

  revalidatePath("/admin");
  redirect("/admin?del=1");
}

export async function listAlunoAno() {
  const supabase = sbAdmin();

  const { data, error } = await supabase
    .from("aluno_ano")
    .select("aluno, ano, serie")
    .order("ano", { ascending: false })
    .order("aluno", { ascending: true });

  if (error) {
    redirect(
      "/admin?err=" + encodeURIComponent(error.message)
    );
  }

  return data ?? [];
}
