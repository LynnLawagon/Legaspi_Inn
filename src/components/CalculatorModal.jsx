import { useEffect, useMemo, useState } from "react";
import "./CalculatorModal.css";

export default function CalculatorModal({ open, onClose }) {
  const [expr, setExpr] = useState("");

  const displayValue = useMemo(() => (expr ? expr : "0"), [expr]);

  const safeEval = (s) => {
    // allow only numbers/operators/decimals/parentheses/percent
    if (!/^[0-9+\-*/().%\s]+$/.test(s)) return "Error";

    // percent handling: 50% => 0.5
    const normalized = s.replace(
      /(\d+(\.\d+)?)%/g,
      (_, n) => String(Number(n) / 100)
    );

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${normalized})`)();
      if (result === Infinity || Number.isNaN(result)) return "Error";
      return String(result);
    } catch {
      return "Error";
    }
  };

  const handleKey = (key) => {
    if (key === "AC") return setExpr("");
    if (key === "DEL") return setExpr((prev) => prev.slice(0, -1));
    if (key === "=") return setExpr((prev) => safeEval(prev));
    setExpr((prev) => prev + key);
  };

  // ESC to close (only when open)
  useEffect(() => {
    if (!open) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="calc-overlay show"
      id="calcOverlay"
      aria-hidden="false"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.(); // click outside
      }}
    >
      <div className="calc" role="dialog" aria-modal="true" aria-label="Calculator">
        <button className="calc-close" type="button" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="calc-display">
          <input id="calcInput" type="text" value={displayValue} readOnly />
        </div>

        <div className="calc-keys">
          <button className="c-btn" onClick={() => handleKey("AC")}>AC</button>
          <button className="c-btn" onClick={() => handleKey("DEL")}>DEL</button>
          <button className="c-btn" onClick={() => handleKey("%")}>%</button>
          <button className="c-btn op" onClick={() => handleKey("/")}>÷</button>

          <button className="c-btn" onClick={() => handleKey("7")}>7</button>
          <button className="c-btn" onClick={() => handleKey("8")}>8</button>
          <button className="c-btn" onClick={() => handleKey("9")}>9</button>
          <button className="c-btn op" onClick={() => handleKey("*")}>×</button>

          <button className="c-btn" onClick={() => handleKey("4")}>4</button>
          <button className="c-btn" onClick={() => handleKey("5")}>5</button>
          <button className="c-btn" onClick={() => handleKey("6")}>6</button>
          <button className="c-btn op" onClick={() => handleKey("-")}>−</button>

          <button className="c-btn" onClick={() => handleKey("1")}>1</button>
          <button className="c-btn" onClick={() => handleKey("2")}>2</button>
          <button className="c-btn" onClick={() => handleKey("3")}>3</button>
          <button className="c-btn op" onClick={() => handleKey("+")}>+</button>

          <button className="c-btn wide" onClick={() => handleKey("0")}>0</button>
          <button className="c-btn" onClick={() => handleKey(".")}>.</button>
          <button className="c-btn eq" onClick={() => handleKey("=")}>=</button>
        </div>
      </div>
    </div>
  );
}
