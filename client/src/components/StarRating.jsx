import { useState } from 'react';

export default function StarRating({ value, onChange, readonly = false }) {
  const [hover, setHover] = useState(0);
  const display = hover || value || 0;

  return (
    <div className={`stars ${readonly ? 'stars--readonly' : ''}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${display >= star ? 'star--filled' : ''}`}
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
        >
          ★
        </span>
      ))}
    </div>
  );
}
