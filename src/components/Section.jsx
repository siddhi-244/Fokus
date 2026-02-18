export default function Section({ title, children, className = '' }) {
  return (
    <div className={`section ${className}`}>
      {title && <h3 className="section-title">{title}</h3>}
      {children}
    </div>
  );
}