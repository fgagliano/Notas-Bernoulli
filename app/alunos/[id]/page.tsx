"use client";

import { useEffect, useState } from "react";

type Aluno = { id: number; nome: string; serie: string; ativo: boolean };
type Etapa = { id: number; nome: string; valor_total: number; ordem: number };

export default function AlunoDetalhePage({ params }: { params: { id: string } }) {
  const alunoId = Number(params.id);

  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregar() {
      setErro("");

      const [ra, re] = await Promise.all([
        fetch(`/api/alunos/${alunoId}`),
        fetch(`/api/etapas`)
      ]);

      const ja = await ra.json().catch(() => ({}));
      const je = await re.json().catch(() => ({}));

      if (!ra.ok) return setErro(ja.error || "Erro ao carregar aluno");
      if (!re.ok) return setErro(je.error || "Erro ao carregar etapas");

      setAluno(ja.data);
      setEtapas(je.data || []);
    }

    if (alunoId) carregar();
  }, [alunoId]);

  return (
    <main style={{ maxWidth: 900, margin: "24px auto", padding: 16 }}>
      <p><a href="/alunos">← Voltar</a></p>

      {erro && <p style={{ color: "crimson" }}>{erro}</p>}

      {!erro && !aluno && <p>Carregando...</p>}

      {aluno && (
        <>
          <h1>{aluno.nome}</h1>
          <p style={{ marginTop: 4, color: "#555" }}>{aluno.serie}</p>

          <h2 style={{ marginTop: 20 }}>Etapas</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {etapas.map((e) => (
              <a
                key={e.id}
                href={`/alunos/${aluno.id}/etapa/${e.id}`}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  padding: "10px 12px",
                  textDecoration: "none"
                }}
              >
                <b>{e.nome}</b> <span style={{ color: "#666" }}>({e.valor_total} pts)</span>
              </a>
            ))}
          </div>

          <p style={{ marginTop: 12, color: "#666" }}>
            Próximo passo: criar a tela da etapa para listar disciplinas e avaliações.
          </p>
        </>
      )}
    </main>
  );
}
