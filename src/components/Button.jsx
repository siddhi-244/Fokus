export default function Button({ children, onClick, variant = 'primary', className = '', disabled = false }) {
  return (
    <button 
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}