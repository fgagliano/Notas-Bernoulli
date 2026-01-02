"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type NotaRow = {
  id: number;
  ano: number;
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

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fmt1(n: number) {
  return round1(n).toFixed(1);
}

/** aceita "8,5" ou "8.5" ou "8" */
function parsePtNumber(s: string): number | null {
  const t = (s ?? "").trim();
  if (t === "") return null;
  const normalized = t.replace(/\./g, "").replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

type EditBuffer = Record<number, { valor_max?: string; nota?: string }>;

export default function Home() {
  const [ano, setAno] = useState<number>(2025);
  const [aluno, setAluno] = useState<(typeof ALUNOS)[number]>("Sofia");
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);

  const [rows, setRows] = useState<NotaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [edit, setEdit] = useState<EditBuffer>({});

  const totalEtapa = ETAPA_TOTAL[etapa];

  async function carregar() {
    setLoading(true);
    setMsg("");

    const { data, error } = await supabase
      .from("notas")
      .select("*")
      .eq("ano", ano)
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
    setEdit({});
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, aluno, etapa]);

  const porDisciplina = useMemo(() => {
    const map: Record<string, NotaRow[]> = {};
    for (const r of rows) {
      const key = (r.disciplina || "").trim() || "(Sem disciplina)";
      (map[key] ||= []).push(r);
    }

    // "Ajuste" por último
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const aa = a.avaliacao?.toLowerCase() === "ajuste" ? 1 : 0;
        const bb = b.avaliacao?.toLowerCase() === "ajuste" ? 1 : 0;
        if (aa !== bb) return aa - bb;
        return (a.created_at || "").localeCompare(b.created_at || "");
      });
    });

    return Object.entries(map);
  }, [rows]);

  async function addLinha(disciplina: string) {
    setMsg("");
    const { error } = await supabase.from("notas").insert({
      ano,
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
      .reduce((acc, r) => acc + toNum(r.valor_max), 0);

    const diff = totalEtapa - somaSemAjuste;

    if (diff < 0) {
      setMsg(`A disciplina "${disciplina}" passou do total (${somaSemAjuste} > ${totalEtapa}). Ajuste os valores.`);
      return;
    }

    if (ajuste) {
      const { error } = await supabase.from("notas").update({ valor_max: diff }).eq("id", ajuste.id);
      if (error) return setMsg(error.message);
    } else {
      const { error } = await supabase.from("notas").insert({
        ano,
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
    const somaMax = round1(list.reduce((a, r) => a + toNum(r.valor_max), 0));
    const somaNota = round1(list.reduce((a, r) => a + toNum(r.nota), 0));
    const somaMedia60 = round1(list.reduce((a, r) => a + round1(toNum(r.valor_max) * 0.6), 0));
    const ok = Math.abs(somaMax - totalEtapa) < 0.001;
    return { somaMax, somaNota, somaMedia60, ok };
  }

  // Tema (Bernoulli-like)
  const bernTeal = "text-[#14b8a6]";
  const bernNavy = "text-[#1f2a6a]";
  const focusRing = "focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6]";

  const td = "px-2 sm:px-4 py-2";

  const inputNum =
    "w-14 sm:w-20 md:w-24 text-right rounded-lg border border-[#2dd4bf]/60 bg-[#e6fffb] " +
    "px-2 py-1 placeholder:text-slate-500 shadow-sm outline-none " +
    focusRing;

  const inputAvaliacao =
    "w-full rounded-lg border px-2 py-1 shadow-sm outline-none " +
    "border-white/50 bg-white/70 focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6]";

  return (
    <div className="min-h-screen text-slate-900">
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#c9f7f1] via-[#bfeff2] to-[#88dfd7]" />
      <div className="absolute inset-0 -z-10 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(107,114,128,0.25)_1px,transparent_0)] [background-size:22px_22px]" />

      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="rounded-2xl border border-white/30 bg-white/60 p-4 shadow-sm backdrop-blur">
            <div className="flex items-baseline gap-2">
              <h1 className={`text-2xl font-extrabold tracking-tight ${bernNavy}`}>Notas</h1>
              <span className={`text-sm font-semibold ${bernTeal}`}>Bernoulli</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">
              Etapas: <b>30</b>, <b>30</b>, <b>40</b>. Cada disciplina deve fechar o total da etapa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-white/30 bg-white/60 p-3 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold text-slate-700">Ano</div>
              <select
                className={`mt-1 w-28 rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-1 text-sm shadow-sm outline-none ${focusRing}`}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/60 p-3 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold text-slate-700">Aluno</div>
              <select
                className={`mt-1 w-40 rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-1 text-sm shadow-sm outline-none ${focusRing}`}
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

            <div className="rounded-2xl border border-white/30 bg-white/60 p-3 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold text-slate-700">Etapa</div>
              <div className="mt-1 flex gap-1">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    className={[
                      "rounded-lg px-3 py-1 text-sm font-semibold shadow-sm",
                      etapa === n
                        ? "bg-[#1f2a6a] text-white"
                        : "bg-white/80 text-slate-800 hover:bg-white",
                    ].join(" ")}
                    onClick={() => setEtapa(n as any)}
                  >
                    {n}ª
                  </button>
                ))}
              </div>
              <div className="mt-1 text-xs text-slate-700">
                Total: <b>{totalEtapa}</b>
              </div>
            </div>

            <button
              className="rounded-2xl bg-[#14b8a6] px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#10a99a] active:translate-y-[1px]"
              onClick={criarDisciplina}
            >
              + Disciplina
            </button>
          </div>
        </header>

        {msg && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-white/70 p-3 text-sm text-red-700 shadow-sm backdrop-blur">
            {msg}
          </div>
        )}

        <div className="space-y-4">
          {loading && (
            <div className="rounded-2xl border border-white/30 bg-white/60 p-4 text-sm text-slate-700 shadow-sm backdrop-blur">
              Carregando…
            </div>
          )}

          {!loading && porDisciplina.length === 0 && (
            <div className="rounded-2xl border border-white/30 bg-white/60 p-6 text-sm text-slate-700 shadow-sm backdrop-blur">
              Nenhuma linha ainda. Clique em <b>+ Disciplina</b> para começar.
            </div>
          )}

          {porDisciplina.map(([disciplina, list]) => {
            const r = disciplinaResumo(list);

            return (
              <div key={disciplina} className="rounded-3xl border border-white/30 bg-white/60 shadow-sm backdrop-blur">
                <div className="flex flex-col gap-2 border-b border-white/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className={`text-lg font-extrabold ${bernNavy}`}>{disciplina}</h2>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
                      <span>
                        Soma Máx:{" "}
                        <b className={r.ok ? "text-emerald-700" : "text-amber-700"}>{fmt1(r.somaMax)}</b> /{" "}
                        {totalEtapa}
                      </span>
                      <span>
                        Nota: <b>{fmt1(r.somaNota)}</b>
                      </span>
                      <span>
                        Média (60%): <b>{fmt1(r.somaMedia60)}</b>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white"
                      onClick={() => addLinha(disciplina)}
                    >
                      + Avaliação
                    </button>

                    <button
                      className="rounded-2xl bg-[#e6fffb] px-3 py-2 text-sm font-bold text-[#0f766e] shadow-sm hover:bg-[#ccfbf1]"
                      onClick={() => fecharTotal(disciplina, list)}
                      title="Cria/atualiza uma linha 'Ajuste' para fechar o total"
                    >
                      Fechar total
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#1f2a6a] to-[#14b8a6] text-left text-xs text-white">
                        <th className="px-2 sm:px-4 py-3">Avaliação</th>
                        <th className="px-2 sm:px-4 py-3">Valor Máx</th>
                        <th className="px-2 sm:px-4 py-3 text-center">Média (60%)</th>
                        <th className="px-2 sm:px-4 py-3">Nota</th>
                        <th className="px-2 sm:px-4 py-3 text-center">Média Acum.</th>
                        <th className="px-2 sm:px-4 py-3 text-center">Nota Acum.</th>
                        <th className="px-2 sm:px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {list.map((row, idx) => {
                        const isAjuste = row.avaliacao?.toLowerCase() === "ajuste";

                        const buf = edit[row.id] || {};
                        const valorMaxEff =
                          buf.valor_max !== undefined ? parsePtNumber(buf.valor_max) ?? 0 : toNum(row.valor_max);

                        const notaEff =
                          buf.nota !== undefined
                            ? parsePtNumber(buf.nota)
                            : row.nota === null || row.nota === undefined
                              ? null
                              : toNum(row.nota);

                        const mediaLinha = round1(valorMaxEff * 0.6);

                        const subset = list.slice(0, idx + 1);

                        const subsetLancado = subset.filter((r) => {
                          const b = edit[r.id] || {};
                          const n =
                            b.nota !== undefined
                              ? parsePtNumber(b.nota)
                              : r.nota === null || r.nota === undefined
                                ? null
                                : toNum(r.nota);
                          return n !== null;
                        });

                        const mediaAcumulada = round1(
                          subsetLancado.reduce((acc, r) => {
                            const b = edit[r.id] || {};
                            const v =
                              b.valor_max !== undefined ? parsePtNumber(b.valor_max) ?? 0 : toNum(r.valor_max);
                            return acc + round1(v * 0.6);
                          }, 0)
                        );

                        const notaAcumulada = round1(
                          subsetLancado.reduce((acc, r) => {
                            const b = edit[r.id] || {};
                            const n =
                              b.nota !== undefined
                                ? parsePtNumber(b.nota)
                                : r.nota === null || r.nota === undefined
                                  ? null
                                  : toNum(r.nota);
                            return acc + (n ?? 0);
                          }, 0)
                        );

                        const notaAbaixoDaMediaLinha = notaEff !== null && notaEff + 1e-9 < mediaLinha;
                        const notaAcumAbaixoMediaAcum =
                          subsetLancado.length > 0 && notaAcumulada + 1e-9 < mediaAcumulada;

                        // ✅ REGRA NOVA:
                        // Só exibe Média Acum / Nota Acum se a LINHA atual tem nota lançada.
                        const notaDaLinhaExiste = notaEff !== null;

                        return (
                          <tr key={row.id} className="border-t border-white/30 bg-white/40">
                            <td className={td}>
                              <input
                                className={[
                                  inputAvaliacao,
                                  isAjuste ? "border-[#14b8a6]/50 bg-[#ccfbf1]" : "",
                                ].join(" ")}
                                value={row.avaliacao || ""}
                                onChange={(e) => patchLinha(row.id, { avaliacao: e.target.value })}
                              />
                            </td>

                            <td className={td}>
                              <input
                                type="text"
                                inputMode="decimal"
                                className={[inputNum, isAjuste ? "bg-[#ccfbf1]" : ""].join(" ")}
                                value={buf.valor_max !== undefined ? buf.valor_max : fmt1(toNum(row.valor_max))}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEdit((prev) => ({ ...prev, [row.id]: { ...prev[row.id], valor_max: v } }));
                                }}
                                onBlur={async () => {
                                  const v = (edit[row.id]?.valor_max ?? "").trim();
                                  if (v === "") {
                                    await patchLinha(row.id, { valor_max: 0 });
                                  } else {
                                    const parsed = parsePtNumber(v);
                                    if (parsed !== null) await patchLinha(row.id, { valor_max: parsed });
                                  }
                                  setEdit((prev) => {
                                    const next = { ...prev };
                                    if (next[row.id]) delete next[row.id].valor_max;
                                    return next;
                                  });
                                }}
                              />
                            </td>

                            <td className={`${td} text-center`}>
                              <span className="inline-flex rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                                {fmt1(mediaLinha)}
                              </span>
                            </td>

                            <td className={td}>
                              <input
                                type="text"
                                inputMode="decimal"
                                className={[
                                  inputNum,
                                  "bg-[#e6fffb]",
                                  notaAbaixoDaMediaLinha ? "text-red-600 font-bold" : "text-slate-900",
                                ].join(" ")}
                                value={
                                  buf.nota !== undefined
                                    ? buf.nota
                                    : row.nota === null || row.nota === undefined
                                      ? ""
                                      : fmt1(toNum(row.nota))
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  setEdit((prev) => ({ ...prev, [row.id]: { ...prev[row.id], nota: v } }));
                                }}
                                onBlur={async () => {
                                  const v = (edit[row.id]?.nota ?? "").trim();
                                  if (v === "") {
                                    await patchLinha(row.id, { nota: null });
                                  } else {
                                    const parsed = parsePtNumber(v);
                                    if (parsed !== null) await patchLinha(row.id, { nota: parsed });
                                  }
                                  setEdit((prev) => {
                                    const next = { ...prev };
                                    if (next[row.id]) delete next[row.id].nota;
                                    return next;
                                  });
                                }}
                              />
                            </td>

                            {/* ✅ Média Acum: só aparece se a linha tem nota */}
                            <td className={`${td} text-center`}>
                              {notaDaLinhaExiste ? (
                                <span className="inline-flex rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                                  {fmt1(mediaAcumulada)}
                                </span>
                              ) : (
                                <span className="text-transparent select-none">.</span>
                              )}
                            </td>

                            {/* ✅ Nota Acum: só aparece se a linha tem nota */}
                            <td className={`${td} text-center`}>
                              {notaDaLinhaExiste ? (
                                <span
                                  className={[
                                    "inline-flex rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold shadow-sm",
                                    notaAcumAbaixoMediaAcum ? "text-red-600" : "text-slate-800",
                                  ].join(" ")}
                                >
                                  {fmt1(notaAcumulada)}
                                </span>
                              ) : (
                                <span className="text-transparent select-none">.</span>
                              )}
                            </td>

                            <td className={`${td} text-right`}>
                              <button
                                className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50/80"
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
                  <div className="border-t border-white/30 bg-amber-50/70 p-3 text-xs font-semibold text-amber-900">
                    Esta disciplina não fecha o total da etapa. Clique em <b>Fechar total</b> para criar/ajustar a linha
                    “Ajuste”.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <footer className="mt-10 rounded-2xl border border-white/30 bg-white/50 p-3 text-xs text-slate-700 shadow-sm backdrop-blur">
          Dica: use “Fechar total” após alterar valores para garantir 30/30/40 por disciplina.
        </footer>
      </div>
    </div>
  );
}
