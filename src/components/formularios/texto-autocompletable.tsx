"use client";
import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
const normalizar = (v: string) =>
  v
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL");
/** Lista editable: las sugerencias nunca limitan los valores nuevos ni cambian campos relacionados. */
export function TextoAutocompletable({
  id,
  valor,
  onChange,
  opciones,
  readOnly,
  disabled,
}: {
  id: string;
  valor: string;
  onChange: (valor: string) => void;
  opciones: string[];
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const lista = useId();
  const [abierto, setAbierto] = useState(false),
    [activo, setActivo] = useState(-1);
  const filtradas = opciones
    .filter((o) => normalizar(o).includes(normalizar(valor)))
    .slice(0, 8);
  const visible = abierto && !readOnly && !disabled;
  function elegir(v: string) {
    onChange(v);
    setAbierto(false);
    setActivo(-1);
  }
  return (
    <div className="relative">
      <Input
        id={id}
        value={valor}
        readOnly={readOnly}
        disabled={disabled}
        maxLength={100}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={visible ? lista : undefined}
        aria-activedescendant={
          visible && activo >= 0 && activo < filtradas.length
            ? `${lista}-${activo}`
            : undefined
        }
        onFocus={() => {
          setAbierto(true);
          setActivo(-1);
        }}
        onBlur={() => setAbierto(false)}
        onChange={(e) => {
          onChange(e.target.value);
          setActivo(-1);
          setAbierto(true);
        }}
        onKeyDown={(e) => {
          if (readOnly || disabled) return;
          if (e.key === "Escape" && visible) {
            e.preventDefault();
            e.stopPropagation();
            setAbierto(false);
            setActivo(-1);
          } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setAbierto(true);
            setActivo((a) =>
              filtradas.length
                ? e.key === "ArrowDown"
                  ? (a + 1) % filtradas.length
                  : a <= 0
                    ? filtradas.length - 1
                    : a - 1
                : -1,
            );
          } else if (
            e.key === "Enter" &&
            visible &&
            activo >= 0 &&
            filtradas[activo]
          ) {
            e.preventDefault();
            elegir(filtradas[activo]);
          }
        }}
      />
      {visible && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
          <ul id={lista} role="listbox" aria-label="Presentaciones sugeridas">
            {filtradas.map((v, i) => (
              <li
                key={v}
                id={`${lista}-${i}`}
                role="option"
                aria-selected={activo === i}
                className={`cursor-pointer rounded-sm px-3 py-2 text-sm ${activo === i ? "bg-accent" : "hover:bg-accent"}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => elegir(v)}
              >
                {v}
              </li>
            ))}
          </ul>
          {!filtradas.length && (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Sin coincidencias. Puedes guardar esta presentación nueva.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
