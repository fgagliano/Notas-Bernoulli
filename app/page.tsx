"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type NotaRow = {
  id: number;
  aluno: string;
  etapa: number;
  disciplina: string;
  avaliacao: string;
  valor_max: number;
  nota: number | null;
  created_at?: string;
};

const ALUNOS = ["Sofia", "Miguel"] as const;

const ETAPA_TOTAL: Record<number, number> = {
  1: 30,
  2: 30,
  3: 40,
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function Home() {
  const [aluno, setAluno] = useState<(typeof ALUNOS)[number]>("Sofia");
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [rows, setRows] = useState<NotaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const totalEtapa = ETAPA_TOTAL[etapa];

  async function carregar() {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("notas")
      .select("*")
      .eq("aluno", aluno)
      .eq("etapa", etapa)
      .order("disciplina", { ascending: true })
      .order("created_at", { ascending: true });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      setRows([]);
      return;
    }

    setRows((data as NotaRow[]) || []);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aluno, etapa]);

  const porDisciplina = useMemo(() => {
    const map = new Map<string, NotaRow[]>();
    for (const r of rows) {
      const key = (r.disciplina || "").trim() || "(Sem disciplina)";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }

    // "Ajuste" por último
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => {
        const aa = a.avaliacao?.toLowerCase() === "ajuste" ? 1 : 0;
        const bb = b.avaliacao?.toLowerCase() === "ajuste" ? 1 : 0;
        if (aa !== bb) return aa - bb;
        return (a.created_at || "").localeCompare(b.created_at || "");
      });
      map.set(k, list);
    }

    return Array.from(map.entries());
  }, [rows]);

  async function addLinha(disciplina: string) {
    setMsg("");
    const { error } = await supabase.from("notas").insert({
      aluno,
      etapa,
      disciplina,
      avaliacao: "Nova avaliação",
      valor_max: 0,
      nota: null,
    });

    if (error) return setMsg(error.message);
    await carregar();
  }

  async function delLinha(id: number) {
    setMsg("");
    const { error } = await supabase.from("notas").delete().eq("id", id);
    if (error) return setMsg(error.message);
    await carregar();
  }

  async function patchLinha(id: number, patch: Partial<NotaRow>) {
    setMsg("");
    const { error } = await supabase.from("notas").update(patch).eq("id", id);
    if (error) return setMsg(error.message);

    setRows((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as NotaRow) : r)));
  }

  async function criarDisciplina() {
    const nome = prompt("Nome da disciplina:");
    if (!nome) return;
    await addLinha(nome.trim());
  }

  async function fecharTotal(disciplina: string, list: NotaRow[]) {
    setMsg("");

    const ajuste = list.find((r) => r.avaliacao?.toLowerCase() === "ajuste");
    const somaSemAjuste = list
      .filter((r) => r.avaliacao?.toLowerCase() !== "ajuste")
      .reduce((acc, r) => acc + (Number(r.valor_max) || 0), 0);

    const diff = round2(totalEtapa - somaSemAjuste);

    if (diff < 0) {
      setMsg(`A disciplina "${disciplina}" passou do total (${somaSemAjuste} > ${totalEtapa}). Ajuste os valores.`);
      return;
    }

    if (ajuste) {
      const { error } = await supabase.from("notas").update({ valor_max: diff }).eq("id", ajuste.id);
      if (error) return setMsg(error.message);
    } else {
      const { error } = await supabase.from("notas").insert({
        aluno,
        etapa,
        disciplina,
        avaliacao: "Ajuste",
        valor_max: diff,
        nota: null,
      });
      if (error) return setMsg(error.message);
    }

    await carregar();
  }

  function disciplinaResumo(list: NotaRow[]) {
    const somaMax = round2(list.reduce((a, r) => a + (Number(r.valor_max) || 0), 0));
    const somaNota = round2(list.reduce((a, r) => a + (Number(r.nota) || 0), 0));
    const somaMedia60 = round2(list.reduce((a, r) => a + round2((Number(r.valor_max) || 0) * 0.6), 0));
    const ok = Math.abs(somaMax - totalEtapa) < 0.001;
    return { somaMax, somaNota, somaMedia60, ok };
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notas</h1>
            <p className="text-sm text-slate-600">
              Etapas: <b>30</b>, <b>30</b>, <b>40</b>. Cada disciplina deve fechar o total da etapa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border bg-white p-2 shadow-sm">
              <div className="text-xs text-slate-500">Aluno</div>
              <select
                className="mt-1 w-40 rounded-lg border px-2 py-1 text-sm"
                value={aluno}
                onChange={(e) => setAluno(e.target.value as any)}
              >
                {ALUNOS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-xl border bg-white p-2 shadow-sm">
              <div className="text-xs text-slate-500">Etapa</div>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={[
                      "rounded-lg px-3 py-1 text-sm font-medium",
                      etapa === n ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200",
                    ].join(" ")}
                    onClick={() => setEtapa(n as any)}
                  >
                    {n}ª
                  </button>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-500">Total: {totalEtapa}</div>
            </div>

            <button
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              onClick={criarDisciplina}
            >
              + Disciplina
            </button>
          </div>
        </header>

        {msg && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{msg}</div>
        )}

        <div className="space-y-4">
          {loading && (
            <div className="rounded-xl border bg-white p-4 text-sm text-slate-600 shadow-sm">Carregando…</div>
          )}

          {!loading && porDisciplina.length === 0 && (
            <div className="rounded-xl border bg-white p-6 text-sm text-slate-600 shadow-sm">
              Nenhuma linha ainda. Clique em <b>+ Disciplina</b> para começar.
            </div>
          )}

          {porDisciplina.map(([disciplina, list]) => {
            const r = disciplinaResumo(list);

            return (
              <div key={disciplina} className="rounded-2xl border bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{disciplina}</h2>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span>
                        Soma Máx:{" "}
                        <b className={r.ok ? "text-emerald-700" : "text-amber-700"}>
                          {r.somaMax}
                        </b>{" "}
                        / {totalEtapa}
                      </span>
                      <span>
                        Nota: <b>{r.somaNota}</b>
                      </span>
                      <span>
                        Média (60%): <b>{r.somaMedia60}</b>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-xl bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200"
                      onClick={() => addLinha(disciplina)}
                    >
                      + Avaliação
                    </button>

                    <button
                      className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800 hover:bg-emerald-100"
                      onClick={() => fecharTotal(disciplina, list)}
                      title="Cria/atualiza uma linha 'Ajuste' para fechar o total"
                    >
                      Fechar total
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs text-slate-600">
                      <tr>
                        <th className="px-4 py-3">Avaliação</th>
                        <th className="px-4 py-3">Valor Máx</th>
                        <th className="px-4 py-3">Média (60%)</th>
                        <th className="px-4 py-3">Nota</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((row) => {
                        const media60 = round2((Number(row.valor_max) || 0) * 0.6);
                        const isAjuste = row.avaliacao?.toLowerCase() === "ajuste";

                        return (
                          <tr key={row.id} className="border-t">
                            <td className="px-4 py-2">
                              <input
                                className={[
                                  "w-full rounded-lg border px-2 py-1",
                                  isAjuste ? "bg-emerald-50" : "bg-white",
                                ].join(" ")}
                                value={row.avaliacao || ""}
                                onChange={(e) => patchLinha(row.id, { avaliacao: e.target.value })}
                              />
                            </td>

                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                className={[
                                  "w-28 rounded-lg border px-2 py-1",
                                  isAjuste ? "bg-emerald-50" : "bg-white",
                                ].join(" ")}
                                value={row.valor_max ?? 0}
                                onChange={(e) => patchLinha(row.id, { valor_max: Number(e.target.value) })}
                              />
                            </td>

                            <td className="px-4 py-2">
                              <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs">{media60}</span>
                            </td>

                            <td className="px-4 py-2">
                              <input
                                type="number"
                                step="0.01"
                                className="w-28 rounded-lg border bg-white px-2 py-1"
                                value={row.nota ?? ""}
                                onChange={(e) =>
                                  patchLinha(row.id, { nota: e.target.value === "" ? null : Number(e.target.value) })
                                }
                              />
                            </td>

                            <td className="px-4 py-2 text-right">
                              <button
                                className="rounded-lg px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                                onClick={() => delLinha(row.id)}
                              >
                                Excluir
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!r.ok && (
                  <div className="border-t bg-amber-50 p-3 text-xs text-amber-800">
                    Esta disciplina não fecha o total da etapa. Clique em <b>Fechar total</b> para criar/ajustar a linha
                    “Ajuste”.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="mt-10 text-xs text-slate-500">
          Dica: use “Fechar total” após alterar valores para garantir 30/30/40 por disciplina.
        </footer>
      </div>
    </div>
  );
} 
