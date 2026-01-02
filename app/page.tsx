"use client";

import { useEffect, useMemo, useState } from "react";

type AlunoRow = { id: number; nome: string; serie: string; ativo: boolean };

type Lancamento = {
  id: number;
  criado_em: string;
  aluno: string;
  serie: string;
  etapa: number;
  disciplina: string;
  avaliacao: string;
  valor_max: number;
  valor_media: number;
  nota: number | null;
};

function toNumber(v: string) {
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : NaN;
}

const LS_KEY_ALUNO = "notas_ultimo_aluno";

export default function Page() {
  // ✅ lista de alunos (para a combobox)
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);

  // ✅ aluno selecionado (persistente)
  const [aluno, setAluno] = useState("");
  const [serie, setSerie] = useState("");
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1);
  const [disciplina, setDisciplina] = useState("");
  const [avaliacao, setAvaliacao] = useState("");

  const [valorMaxStr, setValorMaxStr] = useState("");
  const [valorMediaStr, setValorMediaStr] = useState("");
  const [notaStr, setNotaStr] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [erro, setErro] = useState<string>("");

  const [ultimos, setUltimos] = useState<Lancamento[]>([]);

  const valorMax = useMemo(() => toNumber(valorMaxStr), [valorMaxStr]);
  const valorMedia = useMemo(() => toNumber(valorMediaStr), [valorMediaStr]);
  const nota = useMemo(() => (notaStr.trim() === "" ? null : toNumber(notaStr)), [notaStr]);

  // ✅ ao carregar a página: restaura aluno salvo e busca a lista de alunos
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY_ALUNO);
    if (saved) setAluno(saved);

    (async () => {
      const r = await fetch("/api/alunos", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (r.ok) setAlunos(j.data || []);
    })();
  }, []);

  // ✅ sempre que mudar o aluno, salva no localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEY_ALUNO, aluno);
  }, [aluno]);

  // ✅ (opcional, mas útil): quando escolher um aluno existente, preenche a Série automaticamente
  useEffect(() => {
    const found = alunos.find((a) => a.nome.toLowerCase() === aluno.trim().toLowerCase());
    if (found) setSerie(found.serie);
  }, [aluno, alunos]);

  // Auto-preenche Valor Média = 60% do Valor Máx (editável)
  useEffect(() => {
    if (valorMaxStr.trim() === "") return;
    const vm = toNumber(valorMaxStr);
    if (!Number.isFinite(vm)) return;
    setValorMediaStr((prev) => {
      if (prev.trim() === "") return String((vm * 0.6).toFixed(2)).replace(".", ",");
      return prev;
    });
  }, [valorMaxStr]);

  async function carregarUltimos() {
    const r = await fetch("/api/notas-lancamentos?limit=20", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return;
    setUltimos(j.data || []);
  }

  useEffect(() => {
    carregarUltimos();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setErro("");

    const payload = {
      aluno: aluno.trim(),
      serie: serie.trim(),
      etapa,
      disciplina: disciplina.trim(),
      avaliacao: avaliacao.trim(),
      valor_max: valorMax,
      valor_media: valorMedia,
      nota: nota
    };

    if (!payload.aluno || !payload.serie || !payload.disciplina || !payload.avaliacao) {
      setErro("Preencha Aluno, Série, Disciplina e Avaliação.");
      return;
    }
    if (!Number.isFinite(payload.valor_max) || payload.valor_max <= 0) {
      setErro("Valor Máx inválido.");
      return;
    }
    if (!Number.isFinite(payload.valor_media) || payload.valor_media < 0) {
      setErro("Valor Média inválido.");
      return;
    }
    if (payload.nota !== null) {
      if (!Number.isFinite(payload.nota)) {
        setErro("Nota inválida.");
        return;
      }
      if (payload.nota < 0 || payload.nota > payload.valor_max) {
        setErro("Nota precisa estar entre 0 e o Valor Máx.");
        return;
      }
    }

    try {
      setLoading(true);
      const r = await fetch("/api/notas-lancamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(j.error || "Erro ao salvar.");
        return;
      }

      setMsg("Salvo ✅");
      setAvaliacao("");
      setValorMaxStr("");
      setValorMediaStr("");
      setNotaStr("");
      await carregarUltimos();
    } catch (err: any) {
      setErro(err?.message || "Falha de rede.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 980, margin: "24px auto", padding: 16 }}>
      <h1>Lançamento de Notas</h1>

      <form onSubmit={salvar} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 14, marginTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* ✅ Aluno = combobox com datalist + persistência */}
          <label style={{ display: "grid", gap: 6 }}>
            <span>Aluno</span>
            <input
              list="alunos-list"
              value={aluno}
              onChange={(e) => setAluno(e.target.value)}
              placeholder="Digite ou selecione"
            />
            <datalist id="alunos-list">
              {alunos.map((a) => (
                <option key={a.id} value={a.nome} />
              ))}
            </datalist>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Série</span>
            <input value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="ex: 8º ano" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Etapa</span>
            <select value={etapa} onChange={(e) => setEtapa(Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}>1ª (30 pts)</option>
              <option value={2}>2ª (30 pts)</option>
              <option value={3}>3ª (40 pts)</option>
            </select>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Disciplina</span>
            <input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} placeholder="ex: Ciências" />
          </label>

          <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>
            <span>Avaliação</span>
            <input value={avaliacao} onChange={(e) => setAvaliacao(e.target.value)} placeholder="ex: Prova A1" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Valor Máx</span>
            <input inputMode="decimal" value={valorMaxStr} onChange={(e) => setValorMaxStr(e.target.value)} placeholder="ex: 8" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Valor Média (60%)</span>
            <input inputMode="decimal" value={valorMediaStr} onChange={(e) => setValorMediaStr(e.target.value)} placeholder="ex: 4,8" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span>Nota</span>
            <input inputMode="decimal" value={notaStr} onChange={(e) => setNotaStr(e.target.value)} placeholder="vazio = ainda não lançou" />
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
          <button type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </button>
          {msg && <span style={{ color: "green" }}>{msg}</span>}
          {erro && <span style={{ color: "crimson" }}>{erro}</span>}
        </div>
      </form>

      <h2 style={{ marginTop: 22 }}>Últimos lançamentos</h2>

      <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Aluno</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Série</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Etapa</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Disciplina</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Avaliação</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Máx</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Média</th>
              <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Nota</th>
            </tr>
          </thead>
          <tbody>
            {ultimos.map((x) => (
              <tr key={x.id}>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.aluno}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.serie}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.etapa}ª</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.disciplina}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.avaliacao}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.valor_max}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.valor_media}</td>
                <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{x.nota ?? "—"}</td>
              </tr>
            ))}
            {ultimos.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: 12, color: "#666" }}>
                  Ainda sem lançamentos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

