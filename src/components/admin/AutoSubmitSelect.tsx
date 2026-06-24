"use client";

type Props = {
  name: string;
  defaultValue?: string;
  placeholder: string;
  options: { value: string; label: string }[];
  className?: string;
};

export function AutoSubmitSelect({ name, defaultValue = "", placeholder, options, className }: Props) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className={className}
      onChange={(e) => {
        if (e.target.value) {
          const formEl = e.target.form;
          if (formEl) formEl.requestSubmit();
        }
      }}
    >
      <option value="" disabled>{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
