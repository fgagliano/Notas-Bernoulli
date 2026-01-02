"use client";

import { useEffect, useState } from "react";

type Aluno = { id: number; nome: string; serie: string; ativo: boolean };

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function carregar() {
    const r = await fetch("/api/alunos");
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErro(j.error || "Erro ao carregar alunos");
      setAlunos([]);
      return;
    }
    setErro("");
    setAlunos(j.data || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarAluno(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const n = nome.trim();
    const s = serie.trim();
    if (!n || !s) {
      setErro("Preencha Nome e Série.");
      return;
    }

    try {
      setLoading(true);
      const r = await fetch("/api/alunos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: n, serie: s })
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(j.error || "Erro ao salvar");
        return;
      }

      setNome("");
      setSerie("");
      await carregar();
    } catch (err: any) {
      setErro(err?.message || "Falha de rede ao salvar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h1>Alunos</h1>

      <form onSubmit={criarAluno} style={{ display: "flex", gap: 8, margin: "16px 0", flexWrap: "wrap" }}>
        <input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input placeholder="Série" value={serie} onChange={(e) => setSerie(e.target.value)} />
        <button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Cadastrar"}
        </button>
      </form>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      <ul style={{ paddingLeft: 18 }}>
        {alunos.map((a) => (
         <li key={a.id} style={{ marginBottom: 8 }}>
  <a href={`/alunos/${a.id}`}>{a.nome}</a> — {a.serie}
</li>

        ))}
        {alunos.length === 0 && !erro && <li style={{ color: "#666" }}>Nenhum aluno cadastrado ainda.</li>}
      </ul>
    </main>
  );
}
