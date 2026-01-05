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
  obs?: string | null;
  created_at?: string;
};

type AlunoAnoRow = {
  aluno: string;
  ano: number;
  serie: string;
};

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

function parsePtNumber(s: string): number | null {
  const t = (s ?? "").trim();
  if (t === "") return null;

  // Se tem vírgula, assumimos pt-BR: "." é milhar e "," é decimal
  if (t.includes(",")) {
    const normalized = t.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  // Se NÃO tem vírgula, assumimos formato com ponto decimal (ex: 7.7)
  // Não remove pontos.
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}


type EditBuffer = Record<number, { valor_max?: string; nota?: string }>;

export default function Home() {
  // 🔽 Agora vem do banco
  const [vinculos, setVinculos] = useState<AlunoAnoRow[]>([]);
  const [loadingVinculos, setLoadingVinculos] = useState(false);

  const [aluno, setAluno] = useState<string>("Miguel");
  const currentYear = new Date().getFullYear();
  const [ano, setAno] = useState<number>(currentYear);
  const [serie, setSerie] = useState<string>("");

  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);

  const [rows, setRows] = useState<NotaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const [edit, setEdit] = useState<EditBuffer>({});
  const [didInitSmartDefaults, setDidInitSmartDefaults] = useState(false);
  const totalEtapa = ETAPA_TOTAL[etapa];

  // ==========================
  // 1) Carrega vínculos aluno_ano
  // ==========================
  async function carregarVinculos() {
    setLoadingVinculos(true);
    setMsg("");

    const { data, error } = await supabase
      .from("aluno_ano")
      .select("aluno, ano, serie")
      .order("aluno", { ascending: true })
      .order("ano", { ascending: false });

    setLoadingVinculos(false);

    if (error) {
      setMsg(error.message);
      setVinculos([]);
      return;
    }

    const list = (data as AlunoAnoRow[]) || [];
    setVinculos(list);

    // Ajusta selections se necessário
    const alunos = Array.from(new Set(list.map((x) => x.aluno)));
    const alunoAtual = alunos.includes(aluno) ? aluno : alunos[0];

    if (alunoAtual) {
      setAluno(alunoAtual);

      const anosDoAluno = list.filter((x) => x.aluno === alunoAtual).map((x) => x.ano);
      const anoAtual = anosDoAluno.includes(ano) ? ano : anosDoAluno[0];

      if (Number.isFinite(anoAtual)) setAno(anoAtual);

      const v = list.find((x) => x.aluno === alunoAtual && x.ano === (Number.isFinite(anoAtual) ? anoAtual : ano));
      setSerie(v?.serie ?? "");
    } else {
      setAluno("");
      setAno(new Date().getFullYear());
      setSerie("");
    }
  }

  useEffect(() => {
    carregarVinculos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Opções dinâmicas
  const alunosDisponiveis = useMemo(() => {
    return Array.from(new Set(vinculos.map((x) => x.aluno)));
  }, [vinculos]);

  const anosDisponiveis = useMemo(() => {
    return vinculos.filter((x) => x.aluno === aluno).map((x) => x.ano);
  }, [vinculos, aluno]);

  useEffect(() => {
    const v = vinculos.find((x) => x.aluno === aluno && x.ano === ano);
    setSerie(v?.serie ?? "");
  }, [vinculos, aluno, ano]);

  // ==========================
  // 2) Carrega notas
  // ==========================
  async function carregarNotas() {
    setLoading(true);
    setMsg("");

    if (!aluno || !Number.isFinite(ano)) {
      setRows([]);
      setLoading(false);
      return;
    }

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
async function escolherEtapaInicialSmart(alunoSel: string, anoSel: number) {
  const { data, error } = await supabase
    .from("notas")
    .select("etapa, avaliacao, nota")
    .eq("aluno", alunoSel)
    .eq("ano", anoSel)
    .in("etapa", [1, 2, 3]);

  if (error) return;

  const list =
    (data as Array<{ etapa: number; avaliacao: string | null; nota: number | null }>) ?? [];

  if (list.length === 0) {
    setEtapa(1);
    return;
  }

  function etapaTemNotaFaltando(e: 1 | 2 | 3) {
    return list.some((r) => {
      if (r.etapa !== e) return false;
      const isAjuste = (r.avaliacao || "").toLowerCase() === "ajuste";
      if (isAjuste) return false;
      return r.nota === null || r.nota === undefined;
    });
  }

  if (etapaTemNotaFaltando(1)) return setEtapa(1);
  if (etapaTemNotaFaltando(2)) return setEtapa(2);
  setEtapa(3);
}

  useEffect(() => {
    carregarNotas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano, aluno, etapa]);
useEffect(() => {
  if (didInitSmartDefaults) return;
  if (loadingVinculos) return;
  if (!aluno || !Number.isFinite(ano)) return;

  escolherEtapaInicialSmart(aluno, ano).finally(() => {
    setDidInitSmartDefaults(true);
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [loadingVinculos, aluno, ano, didInitSmartDefaults]);

  const porDisciplina = useMemo(() => {
    const map: Record<string, NotaRow[]> = {};
    for (const r of rows) {
      const key = (r.disciplina || "").trim() || "(Sem disciplina)";
      (map[key] ||= []).push(r);
    }

    Object.keys(map).forEach((k) => {
  map[k].sort((a, b) => {
    // 1️⃣ Ajuste sempre por último
    const aa = a.avaliacao?.toLowerCase() === "ajuste" ? 1 : 0;
    const bb = b.avaliacao?.toLowerCase() === "ajuste" ? 1 : 0;
    if (aa !== bb) return aa - bb;

    // 2️⃣ Ordem alfabética da avaliação (A1, A2, A5, A6...)
    return (a.avaliacao || "").localeCompare(b.avaliacao || "", "pt-BR", {
      numeric: true,
      sensitivity: "base",
    });
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
    await carregarNotas();
  }

  async function delLinha(id: number) {
    setMsg("");
    const { error } = await supabase.from("notas").delete().eq("id", id);
    if (error) return setMsg(error.message);
    await carregarNotas();
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

    await carregarNotas();
  }

  function disciplinaResumo(list: NotaRow[]) {
  const somaMax = round1(list.reduce((a, r) => a + toNum(r.valor_max), 0));
  const ok = Math.abs(somaMax - totalEtapa) < 0.001;

  // diff > 0 => faltou (mantém comportamento atual)
  // diff = 0 => ok (some)
  // diff < 0 => excedeu
  const diff = round1(totalEtapa - somaMax);
  const excedeu = diff < 0 ? round1(-diff) : 0;

  return { somaMax, ok, diff, excedeu };
}

function formatarAvaliacao(nome: string) {
  if (!nome) return nome;

  const prefix = "para casa";

  if (nome.toLowerCase().startsWith(prefix)) {
    return "P/ 🏠" + nome.slice(prefix.length);
  }

  return nome;
}

  
  // Tema (Bernoulli-like)
  const bernTeal = "text-[#14b8a6]";
  const bernNavy = "text-[#1f2a6a]";
  const focusRing = "focus:ring-2 focus:ring-[#14b8a6] focus:border-[#14b8a6]";

  const td = "px-0.5 sm:px-4 py-2";

  const inputNum =
  "w-11 sm:w-16 md:w-20 text-right rounded-lg border border-[#2dd4bf]/60 bg-[#e6fffb] " +
  "px-1 py-1 placeholder:text-slate-500 shadow-sm outline-none " +
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
            <div className="mt-2 text-xs text-slate-700">
              {serie ? (
                <>
                  Série: <b className="text-[#1f2a6a]">{serie}</b>
                </>
              ) : (
                <span className="text-amber-700">
                  Cadastre o vínculo Aluno+Ano em <b>/admin</b> para mostrar a série.
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-white/30 bg-white/60 p-3 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold text-slate-700">Aluno</div>
              <select
                className={`mt-1 w-40 rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-1 text-sm shadow-sm outline-none ${focusRing}`}
                value={aluno}
                onChange={(e) => {
                  const novoAluno = e.target.value;
                  setAluno(novoAluno);

                  const anos = vinculos.filter((x) => x.aluno === novoAluno).map((x) => x.ano);
                  const novoAno = anos[0];
                  if (Number.isFinite(novoAno)) setAno(novoAno);

                  const v = vinculos.find((x) => x.aluno === novoAluno && x.ano === novoAno);
                  setSerie(v?.serie ?? "");
                }}
                disabled={loadingVinculos || alunosDisponiveis.length === 0}
              >
                {alunosDisponiveis.length === 0 ? (
                  <option value="">(Cadastre em /admin)</option>
                ) : (
                  alunosDisponiveis.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="rounded-2xl border border-white/30 bg-white/60 p-3 shadow-sm backdrop-blur">
              <div className="text-xs font-semibold text-slate-700">Ano</div>
              <select
                className={`mt-1 w-28 rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-1 text-sm shadow-sm outline-none ${focusRing}`}
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                disabled={loadingVinculos || anosDisponiveis.length === 0}
              >
                {anosDisponiveis.length === 0 ? (
                  <option value={ano}>{ano}</option>
                ) : (
                  anosDisponiveis.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))
                )}
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
                      etapa === n ? "bg-[#1f2a6a] text-white" : "bg-white/80 text-slate-800 hover:bg-white",
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
              disabled={!aluno || !Number.isFinite(ano)}
              title={!aluno ? "Cadastre aluno/ano em /admin" : ""}
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
            const obs = (list.find((x) => (x.obs ?? "").trim() !== "")?.obs ?? "").trim();

            return (
              <div key={disciplina} className="rounded-3xl border border-white/30 bg-white/60 shadow-sm backdrop-blur">
                <div className="flex items-center justify-between gap-2 border-b border-white/30 p-4">
                  <div>
  <h2 className={`text-lg font-extrabold ${bernNavy}`}>{disciplina}</h2>

  {(() => {
    const obs = (list.find((x) => (x.obs ?? "").trim() !== "")?.obs ?? "").trim();
    if (!obs) return null;
    return (
      <div className="mt-1 whitespace-pre-line text-xs font-semibold text-slate-700">
        {obs}
      </div>
    );
  })()}

  {/* ✅ SOMA MÁX (só enquanto não fechou) */}
  {r.diff > 0 && (
    <div className="mt-1 text-xs text-slate-700">
      Soma Máx: <b className="text-amber-700">{fmt1(r.somaMax)}</b> / {totalEtapa}{" "}
      <span className="text-slate-500">(complete os valores)</span>
    </div>
  )}



                    {/* ✅ FRASES (faltam / em disputa) — aqui estava faltando no seu arquivo */}
                    {(() => {
                      const mediaEtapa = totalEtapa * 0.6;

                      // nota acumulada real: soma das notas lançadas (null não conta)
                      const notaLancada = round1(list.reduce((acc, rr) => acc + (rr.nota ?? 0), 0));
                      const temAlgumaNota = list.some((rr) => rr.nota !== null && rr.nota !== undefined);

                      // quanto falta pra média
                      const faltam = round1(Math.max(0, mediaEtapa - notaLancada));

                      // pontos ainda "em disputa": somatório do valor_max das avaliações SEM nota (e não conta Ajuste)
                      const emDisputa = round1(
                        list
                          .filter((rr) => {
                            const semNota = rr.nota === null || rr.nota === undefined;
                            const isAjuste = (rr.avaliacao || "").toLowerCase() === "ajuste";
                            return semNota && !isAjuste;
                          })
                          .reduce((acc, rr) => acc + toNum(rr.valor_max), 0)
                      );

                      const atingiuMedia = temAlgumaNota && notaLancada >= mediaEtapa - 1e-9;
                      if (!temAlgumaNota || atingiuMedia || emDisputa <= 0) return null;

                      return (
                        <div className="mt-1 flex flex-col gap-1 text-xs text-slate-700">
                          <span>
                            Faltam <b className="text-[#1f2a6a]">{fmt1(faltam)}</b> pontos para atingir a média da etapa.
                          </span>
                          <span>
                            Ainda há <b className="text-[#1f2a6a]">{fmt1(emDisputa)}</b> pontos em disputa.
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-2xl bg-white/80 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-white"
                      onClick={() => addLinha(disciplina)}
                    >
                      + Avaliação
                    </button>

                    {r.diff > 0 && (
  <button
    className="rounded-2xl bg-[#e6fffb] px-3 py-2 text-sm font-bold text-[#0f766e] shadow-sm hover:bg-[#ccfbf1]"
    onClick={() => fecharTotal(disciplina, list)}
    title="Cria/atualiza uma linha 'Ajuste' para fechar o total"
  >
    Fechar total
  </button>
)}

                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-[#1f2a6a] to-[#14b8a6] text-left text-xs text-white">
                        <th className="px-0.5 sm:px-4 py-3 text-center">Avaliação</th>
                        <th className="px-0.5 sm:px-4 py-3 text-center">Valor</th>
                        <th className="px-0.5 sm:px-4 py-3 text-center">Média</th>
                        <th className="px-0.5 sm:px-4 py-3 text-center">Nota</th>
                        <th className="px-0.5 sm:px-4 py-3 text-center">Média Acum.</th>
                        <th className="px-0.5 sm:px-4 py-3 text-center">Nota Acum.</th>
                        <th className="px-0.5 sm:px-4 py-3 text-center">Del</th>
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
                            const v = b.valor_max !== undefined ? parsePtNumber(b.valor_max) ?? 0 : toNum(r.valor_max);
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
                                  if (edit[row.id]?.valor_max === undefined) return;

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
                              <span className="inline-flex rounded-lg bg-white/70 px-1.5 py-0.5 text-xs font-semibold text-slate-800 shadow-sm">
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
                                  notaAbaixoDaMediaLinha ? "text-red-600" : "text-slate-900",
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
                                  if (edit[row.id]?.nota === undefined) return;

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

                            <td className={`${td} text-center`}>
                              {notaDaLinhaExiste ? (
                                <span className="inline-flex rounded-lg bg-white/70 px-2 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                                  {fmt1(mediaAcumulada)}
                                </span>
                              ) : (
                                <span className="text-transparent select-none">.</span>
                              )}
                            </td>

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
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {!r.ok && r.excedeu === 0 && (
  <div className="border-t border-white/30 bg-amber-50/70 p-3 text-xs font-semibold text-amber-900">
    Esta disciplina não fecha o total da etapa. Clique em <b>Fechar total</b> para criar/ajustar a linha “Ajuste”.
  </div>
)}

{!r.ok && r.excedeu > 0 && (
  <div className="border-t border-white/30 bg-white/60 p-3 text-xs font-semibold text-slate-800">
    Esta etapa possui <b>{fmt1(r.excedeu)}</b> ponto(s) extras.
  </div>
)}

              </div>
            );
          })}
        </div>

        <footer className="mt-10 rounded-2xl border border-white/30 bg-white/50 p-3 text-xs text-slate-700 shadow-sm backdrop-blur">
          Dica: cadastre os vínculos em <b>/admin</b> para liberar aluno/ano e mostrar a série automaticamente.
        </footer>
      </div>
    </div>
  );
}
