import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import "./SearchableSelect.css";

/**
 * @param {Object} props
 * @param {string} props.label
 * @param {{ id: string, label: string }[]} props.options
 * @param {string} props.value - selected id
 * @param {(id: string) => void} props.onChange
 * @param {string} [props.placeholder] - closed state when nothing selected
 * @param {string} [props.inputPlaceholder] - inside search field when open
 * @param {{ id: string, label: string } | null} [props.emptyOption] - e.g. city "Any city"
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.loading]
 * @param {boolean} [props.required]
 */
function SearchableSelect({
  label,
  options,
  value,
  onChange,
  placeholder = "Search…",
  inputPlaceholder = "Type to filter…",
  emptyOption = null,
  disabled = false,
  loading = false,
  required = false,
}) {
  const baseId = useId();
  const listId = `${baseId}-list`;
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selected = useMemo(() => {
    if (emptyOption && value === emptyOption.id) return emptyOption;
    return options.find((o) => o.id === value) ?? null;
  }, [options, value, emptyOption]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const head = [];
    if (emptyOption) {
      if (!q || emptyOption.label.toLowerCase().includes(q)) {
        head.push({ ...emptyOption, _empty: true });
      }
    }
    return [...head, ...filtered];
  }, [emptyOption, filtered, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      const t = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(t);
    }
  }, [open]);

  useEffect(() => {
    setHighlight(0);
  }, [query, rows.length]);

  const pick = useCallback(
    (id) => {
      onChange(id);
      setOpen(false);
      setQuery("");
    },
    [onChange]
  );

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, rows.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter" && rows[highlight]) {
      e.preventDefault();
      pick(rows[highlight].id);
    }
  };

  const displayText = selected ? selected.label : "";

  return (
    <div
      className={`searchable-select ${open ? "searchable-select--open" : ""} ${disabled ? "searchable-select--disabled" : ""}`}
      ref={wrapRef}
    >
      <span className="searchable-select__label">
        {label}
        {required && <span className="required-star"> *</span>}
      </span>

      <button
        type="button"
        className="searchable-select__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        disabled={disabled || loading}
        onClick={() => !disabled && !loading && setOpen((o) => !o)}
      >
        <span className={`searchable-select__value ${!displayText ? "searchable-select__value--placeholder" : ""}`}>
          {loading ? "Loading…" : displayText || placeholder}
        </span>
        <span className="searchable-select__chevron" aria-hidden="true">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="searchable-select__dropdown" onKeyDown={onKeyDown}>
          <div className="searchable-select__search-wrap">
            <span className="searchable-select__search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              ref={inputRef}
              type="text"
              className="searchable-select__search"
              placeholder={inputPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              aria-autocomplete="list"
              aria-controls={listId}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <ul id={listId} className="searchable-select__list" role="listbox">
            {rows.length === 0 ? (
              <li className="searchable-select__empty">No matches</li>
            ) : (
              rows.map((row, i) => (
                <li key={row.id === "" ? "__empty__" : row.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === row.id}
                    className={`searchable-select__option ${i === highlight ? "searchable-select__option--hl" : ""} ${row._empty ? "searchable-select__option--muted" : ""}`}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pick(row.id)}
                  >
                    {row.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
