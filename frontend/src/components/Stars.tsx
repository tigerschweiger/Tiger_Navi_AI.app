interface StarsProps {
  value: number;
  onChange?: (value: number) => void;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

export function Stars({ value, onChange }: StarsProps) {
  return (
    <span className="stars">
      {STAR_VALUES.map((star) => (
        <button
          key={star}
          type="button"
          className={star <= value ? "star filled" : "star"}
          onClick={onChange ? () => onChange(star) : undefined}
          disabled={!onChange}
          aria-label={`${star} 星`}
        >
          ★
        </button>
      ))}
    </span>
  );
}
