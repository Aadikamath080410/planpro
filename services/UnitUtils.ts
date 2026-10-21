 export const toFeetInches = (meters: number) => {
  const totalInches = (meters || 0) * 39.3701;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle rounding: if inches rounds up to 12, add to feet
  if (inches >= 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
};

export const toMeters = (feet: number | string, inches: number | string) => {
  const f = parseFloat(feet as string) || 0;
  const i = parseFloat(inches as string) || 0;
  return parseFloat(((f * 12 + i) / 39.3701).toFixed(4));
};

export const toFeetDecimal = (meters: number) => {
  return parseFloat(((meters || 0) * 3.28084).toFixed(2));
};

export const toMetersFromDecimal = (feet: number) => {
  return parseFloat(((feet || 0) / 3.28084).toFixed(4));
};

export const formatArea = (sqMeters: number, units: 'METRIC' | 'IMPERIAL') => {
  if (units === 'METRIC') {
    return `${(sqMeters || 0).toFixed(2)} m²`;
  } else {
    const sqFeet = (sqMeters || 0) * 10.7639;
    return `${sqFeet.toFixed(2)} ft²`;
  }
};
