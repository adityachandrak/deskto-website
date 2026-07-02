import logoImg from '@/assets/deskto-logo.png';

export function BrandMark({ size = 38 }: { size?: number }) {
  // Since the new logo includes text and is rectangular, we use the size prop 
  // to set the height and let the width scale automatically.
  // We'll multiply the size slightly to make the logo look appropriately large.
  const logoHeight = size * 1.4;
  return (
    <img 
      src={logoImg} 
      alt="DESKTO Logo" 
      style={{ 
        height: logoHeight, 
        width: 'auto',
        display: 'block' 
      }} 
    />
  );
}
