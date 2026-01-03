import { listAlunoAno, upsertAlunoAno, deleteAlunoAno } from "./actions";

const ALUNOS = ["Sofia", "Miguel"] as const;

export default async function AdminPage() {
  const items = await listAlunoAno();

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#c9f7f1] via-[#bfeff2] to-[#88dfd7] p-4 sm:p-6 text-slate-900">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-3xl border border-white/30 bg-white/60 p-5 shadow-sm backdrop-blur">
          <h1 className="text-xl font-extrabold text-[#1f2a6a]">Admin · Série por ano</h1>
          <p className="mt-1 text-sm text-slate-700">
            Vincule <b>Aluno + Ano → Série</b> (ex.: Miguel + 2025 → 8EF). Isso evita erro na tabela de notas.
          </p>

          <div className="mt-4 grid gap-3">
            <form action={upsertAlunoAno} className="grid gap-3 rounded-2xl bg-white/50 p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="text-sm">
                  <div className="text-xs font-semibold text-slate-700">Aluno</div>
                  <select
                    name="aluno"
                    className="mt-1 w-full rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-2 outline-none focus:ring-2 focus:ring-[#14b8a6]"
                    defaultValue="Miguel"
                  >
                    {ALUNOS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <div className="text-xs font-semibold text-slate-700">Ano</div>
                  <input
                    name="ano"
                    type="number"
                    className="mt-1 w-full rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-2 outline-none focus:ring-2 focus:ring-[#14b8a6]"
                    defaultValue={2025}
                  />
                </label>

                <label className="text-sm">
                  <div className="text-xs font-semibold text-slate-700">Série</div>
                  <input
                    name="serie"
                    type="text"
                    placeholder="ex.: 8EF"
                    className="mt-1 w-full rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-2 outline-none focus:ring-2 focus:ring-[#14b8a6]"
                  />
                </label>
              </div>

              <label className="text-sm">
                <div className="text-xs font-semibold text-slate-700">Código de admin</div>
                <input
                  name="admin_secret"
                  type="password"
                  className="mt-1 w-full rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-2 outline-none focus:ring-2 focus:ring-[#14b8a6]"
                  placeholder="(o mesmo que você colocou em ADMIN_SECRET)"
                />
              </label>

              <button className="rounded-2xl bg-[#14b8a6] px-4 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-[#10a99a]">
                Salvar vínculo (upsert)
              </button>
            </form>

            <div className="rounded-2xl bg-white/50 p-4">
              <div className="text-sm font-bold text-[#1f2a6a]">Vínculos cadastrados</div>

              {items.length === 0 ? (
                <div className="mt-2 text-sm text-slate-700">Nenhum vínculo ainda.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-700">
                        <th className="py-2">Aluno</th>
                        <th className="py-2">Ano</th>
                        <th className="py-2">Série</th>
                        <th className="py-2 text-right">Excluir</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it) => (
                        <tr key={`${it.aluno}-${it.ano}`} className="border-t border-white/40">
                          <td className="py-2">{it.aluno}</td>
                          <td className="py-2">{it.ano}</td>
                          <td className="py-2 font-semibold">{it.serie}</td>
                          <td className="py-2 text-right">
                            <form action={deleteAlunoAno} className="inline-flex gap-2">
                              <input type="hidden" name="aluno" value={it.aluno} />
                              <input type="hidden" name="ano" value={String(it.ano)} />
                              <input
                                name="admin_secret"
                                type="password"
                                placeholder="código"
                                className="w-28 rounded-lg border border-[#2dd4bf]/50 bg-white/80 px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-[#14b8a6]"
                              />
                              <button className="rounded-lg px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50/80">
                                Excluir
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 text-xs text-slate-600">
                Dica: comece cadastrando 2025 e 2026 para Miguel e Sofia.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
