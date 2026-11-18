const fieldClass =
  "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-admin-accent focus:ring-2 focus:ring-[#1d63ed]/20";

export function ProductDimensoesFieldset({
  defaultComprimento = "",
  defaultLargura = "",
  defaultAltura = "",
  defaultPeso = "",
  fieldsRequired = true,
}: {
  defaultComprimento?: string;
  defaultLargura?: string;
  defaultAltura?: string;
  defaultPeso?: string;
  /** When false (draft products), HTML required is omitted so incomplete drafts can be saved. */
  fieldsRequired?: boolean;
}) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 md:p-5">
      <legend className="text-sm font-semibold text-gray-900">Dimensões do produto (bruto)</legend>
      <p className="text-xs leading-relaxed text-gray-600">
        Medidas da peça sem embalagem.
      </p>
      <p className="text-xs leading-relaxed text-admin-accent">
        {fieldsRequired
          ? "Esses campos são obrigatórios para calcular frete por CEP."
          : "Obrigatórios para publicar o produto e calcular frete por CEP."}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod_comprimento_cm" className="text-sm font-medium text-gray-700">
            Comprimento (cm)
          </label>
          <input
            id="prod_comprimento_cm"
            name="prod_comprimento_cm"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required={fieldsRequired}
            defaultValue={defaultComprimento}
            className={fieldClass}
            placeholder="Ex.: 25"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod_largura_cm" className="text-sm font-medium text-gray-700">
            Largura (cm)
          </label>
          <input
            id="prod_largura_cm"
            name="prod_largura_cm"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required={fieldsRequired}
            defaultValue={defaultLargura}
            className={fieldClass}
            placeholder="Ex.: 18"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod_altura_cm" className="text-sm font-medium text-gray-700">
            Altura (cm)
          </label>
          <input
            id="prod_altura_cm"
            name="prod_altura_cm"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required={fieldsRequired}
            defaultValue={defaultAltura}
            className={fieldClass}
            placeholder="Ex.: 7"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="prod_peso_kg" className="text-sm font-medium text-gray-700">
            Peso do produto (kg)
          </label>
          <input
            id="prod_peso_kg"
            name="prod_peso_kg"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.001"
            required={fieldsRequired}
            defaultValue={defaultPeso}
            className={fieldClass}
            placeholder="Ex.: 0.850"
          />
        </div>
      </div>
    </fieldset>
  );
}
