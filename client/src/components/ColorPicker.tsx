import { colors, type Color } from 'uno-model/src/model/deck'

export default function ColorPicker({ onSelect }: { onSelect: (color: Color) => void }) {
  return (
    <div className="color-picker">
      <p>Select a color for the wild card:</p>
      {colors.map(color =>
        <button key={color} className={`color-btn ${color.toLowerCase()}`} onClick={() => onSelect(color)}>
          {color}
        </button>)}
    </div>
  )
}
