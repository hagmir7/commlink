export const LabeledField = ({ label, labelWidth = 96, children }) => (
  <div className="flex items-center gap-2">
    <span
      className="text-[12px] text-gray-700 text-right shrink-0 whitespace-nowrap"
      style={{ width: labelWidth }}
    >
      {label}
    </span>

    {children}
  </div>
)

export const FieldError = ({ error, offset = 104 }) =>
  error ? (
    <span className="text-[11px] text-red-600" style={{ marginLeft: offset }}>
      {error}
    </span>
  ) : null
