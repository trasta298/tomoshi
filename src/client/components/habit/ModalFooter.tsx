interface ModalFooterProps {
  onSubmit: () => void
  disabled: boolean
  submitting: boolean
  submitLabel: string
}

export function ModalFooter({
  onSubmit,
  disabled,
  submitting,
  submitLabel
}: ModalFooterProps): JSX.Element {
  const isDisabled = submitting || disabled

  return (
    <div className="px-6 pb-6">
      <button
        type="button"
        onClick={onSubmit}
        disabled={isDisabled}
        className="button button--primary w-full"
        style={{
          opacity: isDisabled ? 0.5 : 1,
          cursor: isDisabled ? 'not-allowed' : 'pointer'
        }}
      >
        {submitLabel}
      </button>

      <div className="flex justify-center mt-4">
        <div
          className="w-12 h-1 rounded-full"
          style={{ background: 'var(--text-secondary)', opacity: 0.3 }}
        />
      </div>
    </div>
  )
}
