import ModernPage from './modern/ModernPage';
import ModernPageHeader from './modern/ModernPageHeader';
import ModernCard from './modern/ModernCard';
import ModernStatCard from './modern/ModernStatCard';
import ModernActionCard from './modern/ModernActionCard';
import ModernEmptyState from './modern/ModernEmptyState';
import ModernLoadingState from './modern/ModernLoadingState';
import ModernBadge from './modern/ModernBadge';
import ModernButton from './modern/ModernButton';

export const PremiumPage = ModernPage;
export const PremiumHeader = ModernPageHeader;
export const PremiumCard = ModernCard;
export const PremiumStatCard = ModernStatCard;
export const PremiumActionCard = ModernActionCard;
export const PremiumEmptyState = ModernEmptyState;
export const PremiumLoadingState = ModernLoadingState;
export const PremiumBadge = ModernBadge;
export const PremiumButton = ModernButton;

export function PremiumAIBox({ title = 'AI Assistant', children }) {
  return <ModernCard title={title}>{children}</ModernCard>;
}
export function PremiumListRow({ title, subtitle, badge }) {
  return <article className="modern-record-item"><strong>{title}</strong><p>{subtitle}</p>{badge || null}</article>;
}
export function PremiumFormSection({ title, children }) {
  return <ModernCard title={title}>{children}</ModernCard>;
}
