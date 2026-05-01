import { Link } from 'react-router-dom';
export default function ModernButton({ as, to, variant = 'primary', children, ...props }) { const className = `modern-button ${variant}`; if (as === Link || to) return <Link className={className} to={to} {...props}>{children}</Link>; return <button className={className} {...props}>{children}</button>; }
