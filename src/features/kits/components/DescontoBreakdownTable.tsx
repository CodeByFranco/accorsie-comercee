const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

type Linha = { rotulo: string; valor: number; destaque?: boolean; negativo?: boolean };

/** Mostra economia em reais (antes → desconto → total), sem percentuais. */
export function DescontoBreakdownTable({
  linhas,
  caption,
}: {
  linhas: Linha[];
  caption?: string;
}) {
  if (linhas.length === 0) return null;
  return (
    <table className="w-full text-left text-sm">
      {caption ? <caption className="sr-only">{caption}</caption> : null}
      <tbody>
        {linhas.map((l) => (
          <tr
            key={l.rotulo}
            className={l.destaque ? "border-t border-store-navy/15 font-bold text-black" : "text-store-navy/80"}
          >
            <th scope="row" className="py-1 pr-3 font-normal">
              {l.rotulo}
            </th>
            <td className="py-1 text-right tabular-nums">
              {l.negativo ? "− " : ""}
              {money.format(Math.abs(l.valor))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}