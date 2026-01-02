"use client";

import { useEffect, useState } from "react";

type Aluno = {
  id: number;
  nome: string;
  serie: string;
  ativo: boolean;
};

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [nome, setNome] = useState("");
  const [serie, setSerie] = useState("");
  const [erro, setErro] = useState("");

  async function carregar() {
    const r = await fetch("/api/alunos");
    const j = await r.json();
    if (!r.ok) {
      setErro(j.error || "Erro ao carregar alunos");
      return;
    }
    setAlunos(j.data || []);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarAluno(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    const r = await fetch("/api/alunos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, serie }),
    });

    const j = await r.json();
    if (!r.ok) {
      setErro(j.error || "Erro ao salvar");
      return;
    }

    setNome("");
    setSerie("");
    carregar();
  }

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <h1>Alunos</h1>

      <form onSubmit={criarAluno} style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />
        <input
          placeholder="Série"
          value={serie}
          onChange={(e) => setSerie(e.target.value)}
        />
        <button type="submit">Cadastrar</button>
      </form>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      <ul style={{ paddingLeft: 18 }}>
        {alunos.map((a) => (
          <li key={a.id}>
            {a.nome} — {a.serie}
          </li>
        ))}
      </ul>
    </main>
  );
}
