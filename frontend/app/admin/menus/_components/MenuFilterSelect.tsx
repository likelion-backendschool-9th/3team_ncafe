"use client";

import { useState } from "react";
import styles from "../menus.module.css";

type Option = { value: string; label: string };

export function MenuFilterSelect({ id, name, options, defaultValue }: {
  id: string;
  name: string;
  options: Option[];
  defaultValue: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const label = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "";

  return (
    <div className={styles.selectControl}>
      <span className={styles.selectDisplay} aria-hidden="true">
        <span>{label}</span>
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="m1 1 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <select id={id} name={name} value={value} onChange={(event) => setValue(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}
