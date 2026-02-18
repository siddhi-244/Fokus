export default function IconButton({ icon: Icon, onClick, className = '', title, size = 20 }) {
  return (
    <button 
      className={`icon-button ${className}`} 
      onClick={onClick}
      title={title}
    >
      <Icon size={size} />
    </button>
  );
}